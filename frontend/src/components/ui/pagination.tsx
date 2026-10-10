import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function pageWindow(page: number, pageCount: number): (number | "…")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

/** Server-rendered pagination that preserves the current query string. */
export function Pagination({
  page,
  pageCount,
  basePath,
  searchParams,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (pageCount <= 1) return null;

  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "page" || v === undefined) continue;
      (Array.isArray(v) ? v : [v]).forEach((val) => qs.append(k, val));
    }
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const item = "grid h-11 min-w-11 place-items-center rounded-full px-3 text-sm transition-colors";

  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(item, "hover:bg-surface")} aria-label="Previous page" scroll>
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "text-line-strong")} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {pageWindow(page, pageCount).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className={cn(item, "text-muted")} aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={cn(item, p === page ? "bg-ink text-canvas" : "hover:bg-surface")}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={href(page + 1)} className={cn(item, "hover:bg-surface")} aria-label="Next page">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "text-line-strong")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
