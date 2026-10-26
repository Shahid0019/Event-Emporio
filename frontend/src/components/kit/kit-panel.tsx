"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, ChevronDown, Info, Plus, RotateCcw, ShoppingBag, Trash2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { swapSuggestions, type KitLine } from "@/lib/kit/buildKit";
import { saveKitToCart } from "@/lib/kit/cart";
import { savedKitsStore, saveKitForLater } from "@/lib/kit/saved";
import { getKitCatalog, kitHasOptionPhotos, kitItemById } from "@/lib/kit/catalog";
import { CUSTOM_FUNCTION, functionDates, KIT_MAX_PER_ORDER, kitCategories } from "@/lib/kit/config";
import { formatEventDate, formatKitAmount, formatUnitPrice, quantityHint } from "@/lib/kit/format";
import {
  addToKit,
  dropSuggestedType,
  markKitInCart,
  removeAddition,
  removeWholeItem,
  resetQty,
  restoreAddition,
  restoreAdditions,
  restoreItem,
  setAddedQty,
  setAddedVariant,
  setQty,
  setVariant,
  sharedKitOf,
  kitStore,
  type KitState,
} from "@/lib/kit/store";
import { cartStore, openCart } from "@/lib/store";
import { occasionName, sizeLabel, tierName } from "@/lib/kit/url";
import { cn } from "@/lib/utils";
import { AddItemsSheet, announceAdd } from "./kit-add-items";
import { KitItemDetails } from "./kit-item-details";
import { KitThumb } from "./kit-thumb";
import { KitGiveaways } from "./kit-giveaways";
import { KitTitleEditor } from "./kit-title";
import { SavedKitsButton } from "./saved-kits";
import { useKit } from "./use-kit";

export { KitThumb };

export function kitSummary(s: KitState): string {
  if (!s.occasion) return "";
  return [
    // A shopper's own function is already named above the summary.
    s.occasion !== CUSTOM_FUNCTION && occasionName(s.occasion),
    sizeLabel(s),
    s.eventDate ? formatEventDate(s.eventDate) : s.date && functionDates.find((d) => d.id === s.date)?.label,
    s.tier && tierName(s.tier),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** The live kit: compact item rows that open for editing, removed tray, budget help and a sticky total. */
export function KitPanel({ showHeader = true, className }: { showHeader?: boolean; className?: string }) {
  const { state, lines, active, gifts, itemsTotal, total, budget, perUnit, unit } = useKit();
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const removed = lines.filter((l) => l.removed);
  // Giveaways are on top of the tier budget, so only the kit items count against it.
  const over = budget !== null && itemsTotal > budget ? itemsTotal - budget : 0;

  return (
    <div className={cn("flex min-h-full flex-col", className)}>
      {showHeader && (
        <header className="px-5 pb-3 pt-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <h2 id="kit-title" className="whitespace-nowrap font-serif text-[1.9rem] leading-none">
              Your kit
            </h2>
            <div className="flex items-center gap-1">
              {state.occasion && (
                <Button variant="ghost" size="sm" onClick={() => setAdding(true)} className="h-10 px-3">
                  <Plus /> Add items
                </Button>
              )}
              <SavedKitsButton />
            </div>
          </div>
          {state.occasion && (
            <>
              <KitTitleEditor className="mt-2" />
              <p className="mt-1.5 truncate text-[0.82rem] text-muted">{kitSummary(state)}</p>
            </>
          )}
        </header>
      )}

      {!state.occasion ? (
        <EmptyKit />
      ) : (
        <div className="flex-1 space-y-6 px-5 pb-6 pt-2 sm:px-6">
          {/* In the phone sheet the header is the sheet's own, so the name sits at the top of the kit. */}
          {!showHeader && <KitTitleEditor className="mt-2" />}
          {over > 0 && <OverBudget over={over} lines={lines} />}

          {kitCategories.map((cat) => {
            // One row per item; several types of an item share it.
            const rows = groupByItem(lines.filter((l) => l.category === cat.id && !l.removed));
            if (!rows.length) return null;
            return (
              <section key={cat.id} aria-labelledby={`kit-cat-${cat.id}`}>
                <h3 id={`kit-cat-${cat.id}`} className="eyebrow flex items-center gap-2 text-accent-ink">
                  {cat.label}
                  <span className="text-muted">· {rows.length}</span>
                </h3>
                <ul className="mt-1 divide-y divide-line">
                  {rows.map((group) => (
                    <ItemRow
                      key={group[0].itemId}
                      group={group}
                      trami={state.trami}
                      extra={state.prefs.extra}
                      open={openId === group[0].itemId}
                      onToggle={() => setOpenId((id) => (id === group[0].itemId ? null : group[0].itemId))}
                    />
                  ))}
                </ul>
              </section>
            );
          })}

          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-3 rounded-card border border-dashed border-line-strong px-4 py-3.5 text-left transition-colors hover:border-ink hover:bg-surface/60"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface">
              <Plus aria-hidden className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium">Add items</span>
              <span className="block text-[0.8rem] text-muted">Anything else you need, e.g. potli or extra cake plates</span>
            </span>
          </button>
          <AddItemsSheet open={adding} onOpenChange={setAdding} lines={lines} onAdded={setOpenId} />

          <KitGiveaways />

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
          itemsTotal={itemsTotal}
          count={active.length + gifts.length}
          perUnit={perUnit}
          unit={unit}
          budget={budget}
          tierLabel={state.tier ? tierName(state.tier) : null}
          state={state}
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
        <p className="mt-2 text-sm text-muted">{getKitCatalog().items.length} items, each counted per trami — one plate for four guests.</p>
      </div>
    </div>
  );
}

/** Lines of the same item, in kit order (suggested line first). */
function groupByItem(lines: KitLine[]): KitLine[][] {
  const groups = new Map<string, KitLine[]>();
  for (const l of lines) groups.set(l.itemId, [...(groups.get(l.itemId) ?? []), l]);
  return [...groups.values()];
}

/**
 * One kit item. Collapsed: name, the types chosen and the total. Opened:
 * every type of the item with how many of each — so "100 plastic and 50
 * wooden spoons" is two quantities in one place.
 */
function ItemRow({
  group,
  trami,
  extra,
  open,
  onToggle,
}: {
  group: KitLine[];
  trami: number;
  extra: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const guests = kitStore.useStore((st) => st.guests);
  const rowRef = useRef<HTMLLIElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsType, setDetailsType] = useState<number | undefined>(undefined);
  const showDetails = (type?: number) => {
    setDetailsType(type);
    setDetailsOpen(true);
  };

  // An opened row can land under the sticky total bar — bring the whole row into view.
  useEffect(() => {
    if (!open || !rowRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rowRef.current.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [open]);

  const first = group[0];
  const item = kitItemById(first.itemId);
  if (!item) return null;
  const suggested = group.find((l) => !l.additionId);
  const byType = new Map(group.map((l) => [l.variantIndex, l]));
  const totalQty = group.reduce((n, l) => n + l.qty, 0);
  const totalPrice = group.reduce((n, l) => n + l.lineTotal, 0);
  const baseQty = first.baseQty;
  const single = group.length === 1;
  const optionPhotos = kitHasOptionPhotos(item.id);
  // The picture and the name open the item's details; the rest of the row opens it for editing.
  const opensDetails = (target: EventTarget) => target instanceof Element && target.closest("[data-details]") !== null;
  const panelId = `kit-item-${item.id}`;

  const changeQty = (line: KitLine, q: number) => (line.additionId ? setAddedQty(line.additionId, q) : setQty(line.itemId, q));

  const addType = (i: number) => {
    // Start the new type with what's still needed, so the item adds up to the suggestion.
    const remaining = baseQty - totalQty;
    const result = addToKit(item.id, i, remaining > 0 ? remaining : Math.ceil(baseQty / 2));
    if (result.kind === "full") announceAdd(result, item.name);
  };

  /** One type only: change which type it is (keeps the quantity). */
  const switchTo = (i: number) => (first.additionId ? setAddedVariant(first.additionId, i) : setVariant(item.id, i));

  const removeType = (line: KitLine) => {
    const label = `${item.name} · ${item.variants[line.variantIndex].name}`;
    if (!line.additionId) {
      dropSuggestedType(item.id);
      return;
    }
    const gone = removeAddition(line.additionId);
    if (gone) toast(`${label} removed`, { action: { label: "Undo", onClick: () => restoreAddition(gone) } });
  };

  const removeAll = () => {
    const gone = removeWholeItem(item.id);
    if (!suggested && gone.length) toast(`${item.name} removed`, { action: { label: "Undo", onClick: () => restoreAdditions(gone) } });
  };

  return (
    <li ref={rowRef} className="scroll-mb-44 scroll-mt-4">
      <button
        type="button"
        onClick={(e) => (opensDetails(e.target) ? showDetails() : onToggle())}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 py-3 text-left"
      >
        <span data-details title="See details" className="rounded-chip transition-opacity hover:opacity-80">
          <KitThumb itemId={item.id} variantIndex={first.variantIndex} className="w-12" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span data-details title="See details" className="truncate font-medium underline-offset-4 hover:underline">
              {item.name}
            </span>
            {!suggested && (
              <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.1em] text-ink">
                Added
              </span>
            )}
          </span>
          <span className="block truncate text-[0.82rem] text-muted">
            {single ? (
              <>
                {item.variants[first.variantIndex].name} · <span className="tabular-nums">{first.qty} pcs</span>
              </>
            ) : (
              group.map((l, i) => (
                <span key={l.lineId}>
                  {i > 0 && " · "}
                  {item.variants[l.variantIndex].name} <span className="tabular-nums">{l.qty}</span>
                </span>
              ))
            )}
          </span>
        </span>
        <span className="w-20 shrink-0 text-right tabular-nums">
          <span className="block font-medium">{formatKitAmount(totalPrice)}</span>
          <span className="block text-[0.75rem] text-muted">{single ? `${formatUnitPrice(first.unitPrice)} each` : `${totalQty} pcs`}</span>
        </span>
        <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-muted transition-transform duration-300", open && "rotate-180")} />
      </button>

      {open && (
        <div id={panelId} className="animate-overlay-in pb-4 sm:pl-15">
          <button
            type="button"
            onClick={() => showDetails()}
            className="mb-2 inline-flex min-h-9 items-center gap-1.5 text-[0.8rem] font-medium text-brand underline-offset-4 hover:underline"
          >
            <Info aria-hidden className="size-3.5" />
            View details
          </button>
          <p className="mb-2 text-[0.8rem] font-medium">
            How many of each {item.optionName.toLowerCase()}?<span className="font-normal text-muted"> Mix as many as you like.</span>
          </p>
          <ul
            role="group"
            aria-label={`${item.name} ${item.optionName.toLowerCase()}`}
            className="divide-y divide-line rounded-control border border-line"
          >
            {item.variants.map((v, i) => {
              const line = byType.get(i);
              return (
                <li key={v.name} className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5", line && "bg-surface/50")}>
                  <button
                    type="button"
                    onClick={() => showDetails(i)}
                    aria-label={`See photos of ${item.name} ${v.name}`}
                    className="shrink-0 rounded-chip transition-opacity hover:opacity-80"
                  >
                    <KitThumb itemId={item.id} variantIndex={i} className={cn("w-10", !optionPhotos && "opacity-90")} />
                  </button>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[0.9rem]", line && "font-medium")}>{v.name}</span>
                    <span className="block text-[0.75rem] tabular-nums text-muted">{formatUnitPrice(v.price)} each</span>
                  </span>
                  {line ? (
                    <span className="flex items-center gap-2">
                      <QuantitySelector
                        value={line.qty}
                        min={1}
                        max={KIT_MAX_PER_ORDER}
                        onChange={(q) => changeQty(line, q)}
                        label={`Quantity for ${item.name} ${v.name}`}
                      />
                      <span className="hidden w-16 text-right text-[0.85rem] font-medium tabular-nums sm:block">
                        {formatKitAmount(line.lineTotal)}
                      </span>
                      {!single && (
                        <button
                          type="button"
                          onClick={() => removeType(line)}
                          aria-label={`Remove ${item.name} ${v.name}`}
                          title="Remove this type"
                          className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                        >
                          <X aria-hidden className="size-4" />
                        </button>
                      )}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      {single && (
                        <button
                          type="button"
                          onClick={() => switchTo(i)}
                          aria-label={`Switch to ${v.name}`}
                          className="inline-flex min-h-10 items-center rounded-full px-3 text-[0.8rem] font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
                        >
                          Switch
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => addType(i)}
                        aria-label={`Add ${v.name}`}
                        className="inline-flex min-h-10 items-center gap-1 rounded-full border border-line-strong px-3.5 text-[0.8rem] font-medium transition-colors hover:border-ink"
                      >
                        <Plus aria-hidden className="size-3.5" />
                        Add
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="min-w-0 flex-1 text-[0.78rem] text-muted">
              {single ? "" : <span className="font-medium text-ink">Total {totalQty} · </span>}
              Suggested {baseQty} ({quantityHint(trami, item.perTrami, extra, guests)})
            </p>
            {single && suggested && suggested.qty !== baseQty && (
              <button
                type="button"
                onClick={() => resetQty(item.id)}
                className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap px-2 text-[0.82rem] font-medium underline-offset-4 hover:underline"
              >
                <RotateCcw aria-hidden className="size-3.5" />
                Reset to {baseQty}
              </button>
            )}
            <button
              type="button"
              onClick={removeAll}
              aria-label={`Remove ${item.name}`}
              title={single ? "Remove" : "Remove all types"}
              className="grid size-11 shrink-0 place-items-center rounded-full text-danger transition-colors hover:bg-danger/10"
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      )}
      <KitItemDetails
        itemId={item.id}
        lines={group}
        trami={trami}
        guests={guests}
        extra={extra}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        initialType={detailsType}
        onEdit={() => {
          setDetailsOpen(false);
          if (!open) onToggle();
        }}
      />
    </li>
  );
}

function OverBudget({ over, lines }: { over: number; lines: KitLine[] }) {
  const suggestions = swapSuggestions(lines);
  return (
    <section aria-labelledby="kit-over" className="rounded-card border border-danger/30 bg-danger/[0.04] p-4">
      <h3 id="kit-over" className="font-sans text-[0.95rem] font-medium tracking-normal text-danger">
        {formatKitAmount(over)} over budget
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
  itemsTotal,
  count,
  perUnit,
  unit,
  budget,
  tierLabel,
  state,
  lines,
}: {
  total: number;
  itemsTotal: number;
  count: number;
  perUnit: number;
  unit: string;
  budget: number | null;
  tierLabel: string | null;
  state: KitState;
  lines: KitLine[];
}) {
  const within = budget !== null && itemsTotal <= budget;
  const bundleId = state.cartBundleId;
  const inBag = cartStore.useStore((cart) => !!bundleId && cart.some((l) => l.bundle?.id === bundleId));
  const isSaved = savedKitsStore.useStore((list) => !!state.savedId && list.some((k) => k.id === state.savedId));
  const kit = sharedKitOf(state);

  const putInBag = () => {
    if (!kit) return;
    const id = saveKitToCart(kit, lines, inBag ? bundleId : undefined);
    markKitInCart(id);
    toast.success(inBag ? "Kit updated in your bag" : "Kit added to your bag", {
      description: "It's one item in your bag — tap Edit kit there to change it.",
      action: { label: "View bag", onClick: openCart },
    });
  };

  return (
    <div className="@container sticky bottom-0 z-10 border-t border-line bg-raised/95 px-5 py-4 backdrop-blur sm:px-6">
      {/* Price on the left, actions on the right; stacked when the panel is narrow. */}
      <div className="flex flex-col gap-3 @[25rem]:flex-row @[25rem]:items-center @[25rem]:justify-between @[25rem]:gap-5">
        <div className="min-w-0">
          <p className="text-[1.65rem] font-medium leading-none tabular-nums">{formatKitAmount(total)}</p>
          <p className="mt-1.5 text-[0.8rem] tabular-nums text-muted">
            {count} {count === 1 ? "item" : "items"} · {formatKitAmount(perUnit)}/{unit}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-12 shrink-0"
            disabled={!kit || count === 0}
            aria-label={isSaved ? "Update saved kit" : "Save kit for later"}
            title={isSaved ? "Update saved kit" : "Save kit for later"}
            onClick={() => {
              if (!kit) return;
              saveKitForLater(kit, lines, state.savedId);
              toast.success(isSaved ? "Saved kit updated" : "Kit saved for later", {
                description: "Find it on this page under Saved kits — it stays on this device.",
              });
            }}
          >
            {isSaved ? <BookmarkCheck /> : <Bookmark />}
          </Button>
          {state.inCart && inBag ? (
            <Link
              href="/cart"
              className={buttonVariants({ className: "h-12 min-w-0 flex-1 bg-success px-6 hover:bg-success/90 @[25rem]:flex-none" })}
            >
              ✓ Kit in bag · View bag
            </Link>
          ) : (
            <Button className="h-12 min-w-0 flex-1 px-6 @[25rem]:flex-none" disabled={count === 0} onClick={putInBag}>
              <ShoppingBag />
              {inBag ? "Update kit in bag" : "Add kit to bag"}
            </Button>
          )}
        </div>
      </div>

      {budget !== null && tierLabel && (
        <div className="mt-3">
          <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", within ? "bg-success" : "bg-danger")}
              style={{ width: `${Math.min(100, (itemsTotal / budget) * 100)}%` }}
            />
          </div>
          <p className={cn("mt-1.5 text-[0.8rem] font-medium", within ? "text-success" : "text-danger")}>
            {within ? "Within" : "Over"} your {tierLabel} budget of {formatKitAmount(budget)}
            {total > itemsTotal && <span className="font-normal text-muted"> · giveaways extra</span>}
          </p>
        </div>
      )}
      <p role="status" className="sr-only">
        {state.inCart && inBag ? "Kit added to your bag." : ""}
      </p>
    </div>
  );
}
