"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { swapSuggestions, type KitLine } from "@/lib/kit/buildKit";
import { addKitToCart } from "@/lib/kit/cart";
import { functionDates, KIT_MAX_PER_ORDER, kitCategories, kitItemById, kitItems } from "@/lib/kit/config";
import { formatKitAmount, formatUnitPrice, quantityHint } from "@/lib/kit/format";
import { kitImage } from "@/lib/kit/products";
import { markKitInCart, removeItem, resetQty, restoreItem, setQty, setVariant, type KitState } from "@/lib/kit/store";
import { occasionName, tierName } from "@/lib/kit/url";
import { cn } from "@/lib/utils";
import { useKit } from "./use-kit";

export function kitSummary(s: KitState): string {
  if (!s.occasion) return "";
  return [
    occasionName(s.occasion),
    `${s.trami} trami`,
    s.date && functionDates.find((d) => d.id === s.date)?.label,
    s.tier && tierName(s.tier),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Small item illustration in a 4:5 tile. */
export function KitThumb({ itemId, className }: { itemId: string; className?: string }) {
  const item = kitItemById(itemId);
  if (!item) return null;
  const image = kitImage(item);
  return (
    <span className={cn("relative block aspect-[4/5] shrink-0 overflow-hidden rounded-chip bg-surface", className)}>
      <Image src={image.src} alt="" fill sizes="64px" className="scale-[1.12] object-cover" />
    </span>
  );
}

/** The live kit: compact item rows that open for editing, removed tray, budget help and a sticky total. */
export function KitPanel({ showHeader = true, className }: { showHeader?: boolean; className?: string }) {
  const { state, lines, active, total, budget, perTrami } = useKit();
  const [openId, setOpenId] = useState<string | null>(null);
  const removed = lines.filter((l) => l.removed);
  const over = budget !== null && total > budget ? total - budget : 0;

  return (
    <div className={cn("flex min-h-full flex-col", className)}>
      {showHeader && (
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pb-3 pt-5 sm:px-6">
          <h2 id="kit-title" className="whitespace-nowrap font-serif text-[1.9rem] leading-none">
            Aapka kit
          </h2>
          {state.occasion && <p className="min-w-0 truncate text-[0.82rem] text-muted">{kitSummary(state)}</p>}
        </header>
      )}

      {!state.occasion ? (
        <EmptyKit />
      ) : (
        <div className="flex-1 space-y-6 px-5 pb-6 pt-2 sm:px-6">
          {over > 0 && <OverBudget over={over} lines={lines} />}

          {kitCategories.map((cat) => {
            const rows = lines.filter((l) => l.category === cat.id && !l.removed);
            if (!rows.length) return null;
            return (
              <section key={cat.id} aria-labelledby={`kit-cat-${cat.id}`}>
                <h3 id={`kit-cat-${cat.id}`} className="eyebrow flex items-center gap-2 text-accent-ink">
                  {cat.label}
                  <span className="text-muted">· {rows.length}</span>
                </h3>
                <ul className="mt-1 divide-y divide-line">
                  {rows.map((l) => (
                    <ItemRow
                      key={l.itemId}
                      line={l}
                      trami={state.trami}
                      extra={state.prefs.extra}
                      open={openId === l.itemId}
                      onToggle={() => setOpenId((id) => (id === l.itemId ? null : l.itemId))}
                    />
                  ))}
                </ul>
              </section>
            );
          })}

          {removed.length > 0 && (
            <section aria-labelledby="kit-removed">
              <h3 id="kit-removed" className="eyebrow text-muted">
                Removed items
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {removed.map((l) => (
                  <li key={l.itemId}>
                    <button
                      type="button"
                      onClick={() => restoreItem(l.itemId)}
                      aria-label={`Add back ${l.name}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-dashed border-line-strong py-1 pl-1.5 pr-4 text-sm transition-colors hover:border-ink"
                    >
                      <KitThumb itemId={l.itemId} className="w-7 rounded-full" />
                      <Plus aria-hidden className="size-3.5" />
                      {l.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {state.occasion && (
        <KitFooter
          total={total}
          count={active.length}
          perTrami={perTrami}
          budget={budget}
          tierLabel={state.tier ? tierName(state.tier) : null}
          inCart={state.inCart}
          lines={lines}
        />
      )}
    </div>
  );
}

function EmptyKit() {
  return (
    <div className="grid flex-1 place-items-center px-6 py-14 text-center">
      <div>
        <div aria-hidden className="mx-auto grid w-fit grid-cols-4 gap-2 opacity-70">
          {["dastarkhan", "salad", "wglass", "box", "spoon", "pglass", "outer", "napkin"].map((id) => (
            <KitThumb key={id} itemId={id} className="w-14" />
          ))}
        </div>
        <p className="mt-8 font-serif text-2xl">Your kit builds itself here as you answer.</p>
        <p className="mt-2 text-sm text-muted">{kitItems.length} items, each counted per trami — one plate for four guests.</p>
      </div>
    </div>
  );
}

function ItemRow({
  line,
  trami,
  extra,
  open,
  onToggle,
}: {
  line: KitLine;
  trami: number;
  extra: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const rowRef = useRef<HTMLLIElement>(null);

  // An opened row can land under the sticky total bar — bring the whole row into view.
  useEffect(() => {
    if (!open || !rowRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rowRef.current.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [open]);

  const item = kitItemById(line.itemId);
  if (!item) return null;
  const variant = item.variants[line.variantIndex];
  const edited = line.qty !== line.baseQty;
  const panelId = `kit-item-${line.itemId}`;

  return (
    <li ref={rowRef} className="scroll-mb-44 scroll-mt-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 py-3 text-left"
      >
        <KitThumb itemId={line.itemId} className="w-12" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{line.name}</span>
          <span className="block truncate text-[0.82rem] text-muted">
            {variant.name} · <span className="tabular-nums">{line.qty} pcs</span>
          </span>
        </span>
        <span className="w-20 shrink-0 text-right tabular-nums">
          <span className="block font-medium">{formatKitAmount(line.lineTotal)}</span>
          <span className="block text-[0.75rem] text-muted">{formatUnitPrice(line.unitPrice)} each</span>
        </span>
        <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted transition-transform duration-300", open && "rotate-180")} />
      </button>

      {open && (
        <div id={panelId} className="animate-overlay-in space-y-3 pb-4 sm:pl-15">
          {/* One swipeable line of options on phones, wrapping on larger screens. */}
          <div
            role="group"
            aria-label={`${line.name} ${item.optionName.toLowerCase()}`}
            className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {item.variants.map((v, i) => (
              <button
                key={v.name}
                type="button"
                aria-pressed={line.variantIndex === i}
                onClick={() => setVariant(line.itemId, i)}
                className="group/chip inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line-strong px-3.5 text-[0.85rem] transition-colors hover:border-ink aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink"
              >
                {line.variantIndex === i && <Check aria-hidden className="size-3.5" />}
                {v.name}
                <span className="tabular-nums text-muted group-aria-pressed/chip:text-brand-ink/80">{formatUnitPrice(v.price)}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <QuantitySelector
              value={line.qty}
              min={1}
              max={KIT_MAX_PER_ORDER}
              step={line.qty >= 50 ? 10 : 1}
              onChange={(q) => setQty(line.itemId, q)}
              label={`Quantity for ${line.name}`}
              className="[&_output]:w-14"
            />
            {edited && (
              <button
                type="button"
                onClick={() => resetQty(line.itemId)}
                className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap px-2 text-[0.82rem] font-medium underline-offset-4 hover:underline"
              >
                <RotateCcw aria-hidden className="size-3.5" />
                Reset to {line.baseQty}
              </button>
            )}
            <button
              type="button"
              onClick={() => removeItem(line.itemId)}
              aria-label={`Remove ${line.name}`}
              title="Remove"
              className="ml-auto grid size-11 shrink-0 place-items-center rounded-full text-danger transition-colors hover:bg-danger/10"
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          </div>

          <p className="text-[0.78rem] text-muted">
            Suggested: {quantityHint(trami, item.perTrami, extra)} = {line.baseQty}
          </p>
        </div>
      )}
    </li>
  );
}

function OverBudget({ over, lines }: { over: number; lines: KitLine[] }) {
  const suggestions = swapSuggestions(lines);
  return (
    <section aria-labelledby="kit-over" className="rounded-card border border-danger/30 bg-danger/[0.04] p-4">
      <h3 id="kit-over" className="font-sans text-[0.95rem] font-medium tracking-normal text-danger">
        Budget se {formatKitAmount(over)} upar hai
      </h3>
      {suggestions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {suggestions.map((s) => {
            const item = kitItemById(s.itemId);
            const from = item?.variants[s.fromIndex].name;
            const to = item?.variants[s.toIndex].name;
            return (
              <li key={s.itemId} className="flex items-center gap-3 rounded-control bg-raised p-2 pr-2.5">
                <KitThumb itemId={s.itemId} className="w-9" />
                <p className="min-w-0 flex-1 text-[0.85rem] leading-snug">
                  <span className="font-medium">{s.name}:</span> {from} → {to}
                  <span className="block text-success">Save {formatKitAmount(s.saving)}</span>
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-11 shrink-0 px-4"
                  onClick={() => setVariant(s.itemId, s.toIndex)}
                  aria-label={`Switch ${s.name} to ${to}, save ${formatKitAmount(s.saving)}`}
                >
                  Apply
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function KitFooter({
  total,
  count,
  perTrami,
  budget,
  tierLabel,
  inCart,
  lines,
}: {
  total: number;
  count: number;
  perTrami: number;
  budget: number | null;
  tierLabel: string | null;
  inCart: boolean;
  lines: KitLine[];
}) {
  const within = budget !== null && total <= budget;
  return (
    <div className="sticky bottom-0 z-10 space-y-3 border-t border-line bg-raised/95 px-5 py-4 backdrop-blur sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <p className="text-[1.65rem] font-medium leading-none tabular-nums">{formatKitAmount(total)}</p>
        <p className="text-right text-[0.82rem] tabular-nums text-muted">
          {count} items · {formatKitAmount(perTrami)}/trami
        </p>
      </div>

      {budget !== null && tierLabel && (
        <div>
          <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", within ? "bg-success" : "bg-danger")}
              style={{ width: `${Math.min(100, (total / budget) * 100)}%` }}
            />
          </div>
          <p className={cn("mt-1.5 text-[0.8rem] font-medium", within ? "text-success" : "text-danger")}>
            {within ? "Within" : "Over"} your {tierLabel} budget of {formatKitAmount(budget)}
          </p>
        </div>
      )}

      {inCart ? (
        <Link href="/cart" className={buttonVariants({ className: "w-full bg-success hover:bg-success/90" })}>
          ✓ In cart · View cart
        </Link>
      ) : (
        <Button
          className="w-full"
          disabled={count === 0}
          onClick={() => {
            addKitToCart(lines);
            markKitInCart();
          }}
        >
          Add all to cart
        </Button>
      )}
      <p role="status" className="sr-only">
        {inCart ? "Kit added to cart." : ""}
      </p>
    </div>
  );
}
