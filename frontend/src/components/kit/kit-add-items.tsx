"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { variantsInKit, type KitLine } from "@/lib/kit/buildKit";
import { getKitCatalog, kitHasOptionPhotos } from "@/lib/kit/catalog";
import { kitCategories } from "@/lib/kit/config";
import { formatUnitPrice } from "@/lib/kit/format";
import { addToKit, type AddResult } from "@/lib/kit/store";
import { cn } from "@/lib/utils";
import { KitThumb } from "./kit-thumb";

/** Toast for an add, and the line to open so the shopper can set its quantity. */
export function announceAdd(result: AddResult, label: string): string | null {
  if (result.kind === "added") toast.success(`${label} added to your kit`, { description: "Set how many you need below." });
  else if (result.kind === "restored") toast.success(`${label} is back in your kit`);
  else if (result.kind === "exists") toast(`${label} is already in your kit`, { description: "Change its quantity instead." });
  else toast.error("Your kit can't take more added items. Remove one first.");
  return result.kind === "full" ? null : result.lineId;
}

/**
 * Picker for adding any kit item: another type of something already in the
 * kit (wooden spoons as well as plastic), or an item this occasion doesn't
 * include. Types already in the kit are marked and can't be added twice.
 */
export function AddItemsSheet({
  open,
  onOpenChange,
  lines,
  onAdded,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: KitLine[];
  /** Called with the item's id after adding, e.g. to open its row. */
  onAdded?: (itemId: string) => void;
  /**
   * Adds the pick somewhere other than the shopper's kit (e.g. a kit the
   * shop is building); return false to keep the picker open.
   */
  onAdd?: (itemId: string, variantIndex: number, label: string) => boolean;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const items = getKitCatalog().items;
  const q = query.trim().toLowerCase();
  const matches = (name: string, variants: { name: string }[]) =>
    !q || name.toLowerCase().includes(q) || variants.some((v) => v.name.toLowerCase().includes(q));

  const add = (itemId: string, variantIndex: number, label: string) => {
    const done = onAdd ? onAdd(itemId, variantIndex, label) : announceAdd(addToKit(itemId, variantIndex), label) !== null;
    if (!done) return;
    onOpenChange(false);
    setQuery("");
    setExpanded(null);
    onAdded?.(itemId);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add items"
      description="Another type of something in your kit, or anything else you need."
      side="right"
    >
      <label className="relative block">
        <span className="sr-only">Search items</span>
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          data-autofocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search, e.g. spoon, wooden, potli"
          className="h-12 w-full rounded-full border border-line-strong bg-canvas pl-11 pr-4 text-sm focus:border-ink focus:outline-none"
        />
      </label>

      <div className="mt-5 space-y-6">
        {kitCategories.map((cat) => {
          const inCat = items.filter((i) => i.category === cat.id && matches(i.name, i.variants));
          if (!inCat.length) return null;
          return (
            <section key={cat.id} aria-labelledby={`add-cat-${cat.id}`}>
              <h3 id={`add-cat-${cat.id}`} className="eyebrow text-accent-ink">
                {cat.label}
              </h3>
              <ul className="mt-1 divide-y divide-line">
                {inCat.map((item) => {
                  const taken = variantsInKit(lines, item.id);
                  const allIn = taken.size >= item.variants.length;
                  const photos = kitHasOptionPhotos(item.id);
                  const isOpen = expanded === item.id || (q.length > 1 && inCat.length <= 3);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setExpanded((id) => (id === item.id ? null : item.id))}
                        aria-expanded={isOpen}
                        className="flex w-full items-center gap-3 py-3 text-left"
                      >
                        <KitThumb itemId={item.id} className="w-11" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{item.name}</span>
                          <span className="block truncate text-[0.8rem] text-muted">
                            {taken.size
                              ? allIn
                                ? "Every type is in your kit"
                                : `${taken.size} of ${item.variants.length} types in your kit`
                              : `${item.variants.length} ${item.variants.length === 1 ? "type" : "types"} · from ${formatUnitPrice(Math.min(...item.variants.map((v) => v.price)))}`}
                          </span>
                        </span>
                        <ChevronDown
                          aria-hidden
                          className={cn("size-4 shrink-0 text-muted transition-transform", isOpen && "rotate-180")}
                        />
                      </button>
                      {isOpen && (
                        <div role="group" aria-label={`${item.name} types`} className="flex flex-wrap gap-2 pb-4 sm:pl-14">
                          {item.variants.map((v, i) => {
                            const inKit = taken.has(i);
                            return (
                              <button
                                key={v.name}
                                type="button"
                                disabled={inKit}
                                onClick={() => add(item.id, i, `${item.name} · ${v.name}`)}
                                aria-label={inKit ? `${item.name} ${v.name} is in your kit` : `Add ${item.name} ${v.name}`}
                                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-[0.85rem] transition-colors hover:border-ink disabled:cursor-default disabled:border-line disabled:bg-surface disabled:text-muted"
                              >
                                <KitThumb
                                  itemId={item.id}
                                  variantIndex={i}
                                  className={cn("-ml-2 w-7 rounded-full", !photos && "opacity-90")}
                                />
                                {inKit ? <Check aria-hidden className="size-3.5" /> : <Plus aria-hidden className="size-3.5" />}
                                {v.name}
                                <span className="tabular-nums text-muted">{inKit ? "in kit" : formatUnitPrice(v.price)}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {items.every((i) => !matches(i.name, i.variants)) && (
          <p className="py-10 text-center text-sm text-muted">No items match “{query}”.</p>
        )}
      </div>
    </Sheet>
  );
}
