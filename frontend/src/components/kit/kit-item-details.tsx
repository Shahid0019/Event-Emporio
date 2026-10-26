"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { KitLine } from "@/lib/kit/buildKit";
import { kitItemById, kitItemPhotos, kitOptionImage, kitOptionPhotos, kitProductForItem } from "@/lib/kit/catalog";
import { kitCategories } from "@/lib/kit/config";
import { formatKitAmount, formatUnitPrice, quantityHint } from "@/lib/kit/format";
import { kitImage } from "@/lib/kit/products";
import { cn } from "@/lib/utils";

/**
 * A closer look at one kit item: big photo (per type when the shop added
 * them), what it is, every type with its price, and what's in the kit now.
 */
export function KitItemDetails({
  itemId,
  lines,
  trami,
  guests,
  extra,
  open,
  onOpenChange,
  onEdit,
  initialType,
}: {
  itemId: string;
  /** This item's lines in the kit (empty if it isn't in the kit). */
  lines: KitLine[];
  trami: number;
  /** Set when the kit is counted by guests (one per person). */
  guests?: number;
  extra: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Close and open the item's row for changing quantities. */
  onEdit?: () => void;
  /** Open on this type's photos (e.g. after tapping its picture). */
  initialType?: number;
}) {
  const item = kitItemById(itemId);
  const [viewing, setViewing] = useState<number | null>(null);
  const [photo, setPhoto] = useState(0);
  if (!item) return null;

  const product = kitProductForItem(itemId);
  const inKit = new Map(lines.filter((l) => !l.removed).map((l) => [l.variantIndex, l]));
  const shown = viewing ?? initialType ?? lines[0]?.variantIndex ?? 0;
  const imageFor = (i: number) => kitOptionImage(itemId, i) ?? product?.images[0] ?? kitImage(item);
  // The shown type's own photos, or the item's main picture when it has none.
  const own = kitOptionPhotos(itemId, shown);
  const photos = own.length ? own : kitItemPhotos(itemId).length ? kitItemPhotos(itemId) : [imageFor(shown)];
  const current = Math.min(photo, photos.length - 1);
  const image = photos[current];
  const showType = (i: number) => {
    setViewing(i);
    setPhoto(0);
  };
  const step = (dir: -1 | 1) => setPhoto((current + dir + photos.length) % photos.length);
  const description = product?.description[0] ?? product?.shortDescription;
  const category = kitCategories.find((c) => c.id === item.category)?.label;
  const totalQty = [...inKit.values()].reduce((n, l) => n + l.qty, 0);
  const totalPrice = [...inKit.values()].reduce((n, l) => n + l.lineTotal, 0);
  const suggested = lines[0]?.baseQty;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setViewing(null);
          setPhoto(0);
        }
      }}
      title={item.name}
      description={category ? `${category} · sold per piece` : "Sold per piece"}
      side="center"
      className="sm:max-w-2xl"
    >
      <div className="grid gap-6 sm:grid-cols-[minmax(0,15rem)_1fr]">
        <div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-media bg-surface">
            <Image
              key={image.src}
              src={image.src}
              alt={image.alt}
              fill
              sizes="(min-width: 640px) 240px, 90vw"
              className={cn("animate-overlay-in object-cover", image.src.endsWith(".svg") && "scale-[1.12]")}
            />
            <span className="absolute left-2 top-2 rounded-full bg-canvas/90 px-2.5 py-1 text-[0.72rem] font-medium">
              {item.variants[shown]?.name}
            </span>
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-canvas/90 shadow-sm hover:bg-canvas"
                >
                  <ChevronLeft aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-canvas/90 shadow-sm hover:bg-canvas"
                >
                  <ChevronRight aria-hidden className="size-4" />
                </button>
                <span className="absolute bottom-2 right-2 rounded-full bg-ink/75 px-2 py-0.5 text-[0.7rem] tabular-nums text-canvas">
                  {current + 1} / {photos.length}
                </span>
              </>
            )}
          </div>
          {photos.length > 1 && (
            <div role="group" aria-label={`Photos of ${item.variants[shown]?.name}`} className="mt-2 flex flex-wrap gap-1.5">
              {photos.map((p, i) => (
                <button
                  key={`${p.src}-${i}`}
                  type="button"
                  onClick={() => setPhoto(i)}
                  aria-label={`Photo ${i + 1} of ${photos.length}`}
                  aria-pressed={current === i}
                  className="relative aspect-[4/5] w-11 overflow-hidden rounded-chip bg-surface ring-offset-2 aria-pressed:ring-2 aria-pressed:ring-brand"
                >
                  <Image src={p.src} alt="" fill sizes="44px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          {description && <p className="text-[0.95rem] leading-relaxed text-muted">{description}</p>}

          <dl className="grid grid-cols-2 gap-3 text-[0.85rem]">
            <div className="rounded-control bg-surface px-3 py-2.5">
              <dt className="text-muted">Suggested for your kit</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {suggested ?? "—"} pcs
                <span className="block text-[0.75rem] font-normal text-muted">{quantityHint(trami, item.perTrami, extra, guests)}</span>
              </dd>
            </div>
            <div className="rounded-control bg-surface px-3 py-2.5">
              <dt className="text-muted">In your kit</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {inKit.size ? `${totalQty} pcs` : "Not added"}
                {inKit.size > 0 && <span className="block text-[0.75rem] font-normal text-muted">{formatKitAmount(totalPrice)}</span>}
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="eyebrow text-accent-ink">{item.optionName}s</h3>
            <ul className="mt-2 divide-y divide-line rounded-control border border-line">
              {item.variants.map((v, i) => {
                const line = inKit.get(i);
                return (
                  <li key={v.name}>
                    <button
                      type="button"
                      onClick={() => showType(i)}
                      aria-pressed={shown === i}
                      className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left", shown === i && "bg-surface/60")}
                    >
                      <span className="relative aspect-[4/5] w-8 shrink-0 overflow-hidden rounded-chip bg-surface">
                        <Image src={imageFor(i).src} alt="" fill sizes="32px" className="object-cover" />
                      </span>
                      <span className="min-w-0 flex-1 text-[0.9rem]">
                        {v.name}
                        {kitOptionPhotos(itemId, i).length > 1 && (
                          <span className="block text-[0.72rem] text-muted">{kitOptionPhotos(itemId, i).length} photos</span>
                        )}
                      </span>
                      {line && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[0.72rem] font-medium tabular-nums text-success">
                          <Check aria-hidden className="size-3" />
                          {line.qty} in kit
                        </span>
                      )}
                      <span className="w-16 text-right text-[0.85rem] tabular-nums text-muted">{formatUnitPrice(v.price)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {onEdit && (
            <Button className="w-full" onClick={onEdit}>
              <SlidersHorizontal /> {inKit.size ? "Change quantities" : "Choose types & quantities"}
            </Button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
