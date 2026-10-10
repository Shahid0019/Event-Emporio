"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AlertDialog } from "radix-ui";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------ Page header ------------------------------ */
export function AdminHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-[0.8rem] text-muted hover:text-ink">
            <ChevronLeft className="size-3.5" /> {back.label}
          </Link>
        )}
        <h1 className="font-serif text-[2.2rem] leading-tight">{title}</h1>
        {description && <p className="mt-1 text-[0.9rem] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("min-w-0 overflow-hidden rounded-card border border-line bg-raised", className)}>
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="font-sans text-[0.95rem] font-medium tracking-normal">{title}</h2>
          {action}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, href }: { label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const body = (
    <>
      <p className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-serif text-[2.1rem] leading-none tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-[0.8rem] text-muted">{hint}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-card border border-line bg-raised p-5 transition-colors hover:border-ink">
      {body}
    </Link>
  ) : (
    <div className="rounded-card border border-line bg-raised p-5">{body}</div>
  );
}

/* -------------------------------- Toggle --------------------------------- */
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6">
      <span>
        <span className="block text-[0.9rem] font-medium">{label}</span>
        {description && <span className="block text-[0.8rem] text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-brand" : "bg-line-strong")}
      >
        <span
          className={cn(
            "absolute left-0 top-0.5 size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        />
      </button>
    </label>
  );
}

/* ------------------------------ Confirm dialog --------------------------- */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-overlay-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-sheet bg-canvas p-6 shadow-xl data-[state=open]:animate-overlay-in">
          <AlertDialog.Title className="font-serif text-2xl">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-[0.9rem] leading-relaxed text-muted">{description}</AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel className={buttonVariants({ variant: "ghost", size: "sm" })}>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action className={buttonVariants({ variant: destructive ? "danger" : "primary", size: "sm" })} onClick={onConfirm}>
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/* -------------------------------- Data table ----------------------------- */
export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchText,
  searchPlaceholder = "Search…",
  pageSize = 12,
  empty = "Nothing to show.",
  toolbar,
  selectable,
  bulkActions,
  initialSort,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  empty?: string;
  toolbar?: ReactNode;
  selectable?: boolean;
  bulkActions?: (selected: string[], clear: () => void) => ReactNode;
  initialSort?: { key: string; dir: "asc" | "desc" };
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  let visible = searchText && query.trim() ? rows.filter((r) => searchText(r).toLowerCase().includes(query.trim().toLowerCase())) : rows;
  const sortCol = sort && columns.find((c) => c.key === sort.key);
  if (sort && sortCol?.sortValue) {
    const get = sortCol.sortValue;
    visible = [...visible].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pageCount);
  const pageRows = visible.slice((current - 1) * pageSize, current * pageSize);
  const pageKeys = pageRows.map(rowKey);
  const allOnPage = pageKeys.length > 0 && pageKeys.every((k) => selected.includes(k));

  return (
    <div className="overflow-hidden rounded-card border border-line bg-raised">
      {(searchText || toolbar) && (
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          {searchText && (
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-10 w-full rounded-full border border-line-strong bg-canvas pl-9 pr-3 text-sm focus:border-ink focus:outline-none"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}

      {selectable && selected.length > 0 && bulkActions && (
        <div className="flex flex-wrap items-center gap-3 border-b border-line bg-accent-soft/40 px-4 py-2.5 text-[0.85rem]">
          <span>{selected.length} selected</span>
          {bulkActions(selected, () => setSelected([]))}
          <button type="button" className="ml-auto text-muted underline underline-offset-4" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-[0.88rem]">
          <thead>
            <tr className="border-b border-line text-[0.7rem] uppercase tracking-[0.12em] text-muted">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={allOnPage}
                    onChange={() =>
                      setSelected((s) => (allOnPage ? s.filter((k) => !pageKeys.includes(k)) : [...new Set([...s, ...pageKeys])]))
                    }
                    className="size-4 accent-[var(--brand)]"
                  />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn("px-4 py-3 font-medium", c.className)}
                    aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 uppercase tracking-[0.12em] hover:text-ink"
                        onClick={() => setSort(active && sort!.dir === "desc" ? { key: c.key, dir: "asc" } : { key: c.key, dir: "desc" })}
                      >
                        {c.header}
                        {active && (sort!.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-14 text-center text-muted">
                  {query ? `No results for “${query}”.` : empty}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const k = rowKey(row);
                return (
                  <tr key={k} className="border-b border-line last:border-0 hover:bg-canvas/70">
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          checked={selected.includes(k)}
                          onChange={() => setSelected((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))}
                          className="size-4 accent-[var(--brand)]"
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[0.8rem] text-muted">
        <span>
          {visible.length === 0 ? "0" : `${(current - 1) * pageSize + 1}–${Math.min(current * pageSize, visible.length)}`} of{" "}
          {visible.length}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={current >= pageCount}
            onClick={() => setPage(current + 1)}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Downloads rows as CSV (client-side export of the current demo data). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
