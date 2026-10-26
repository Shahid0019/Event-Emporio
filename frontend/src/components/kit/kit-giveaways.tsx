"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Gift, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { Sheet } from "@/components/ui/sheet";
import { getKitCatalog } from "@/lib/kit/catalog";
import { KIT_MAX_PER_ORDER } from "@/lib/kit/config";
import { formatKitAmount, formatUnitPrice } from "@/lib/kit/format";
import { giftsTotal, type GiftLine, type GiftProduct } from "@/lib/kit/gifts";
import { addGift, giftSheetStore, guestsOf, openGiftSheet, removeGift, restoreGift, setGiftQty, setGiftVariant } from "@/lib/kit/store";
import { cn } from "@/lib/utils";
import { useKit } from "./use-kit";

/** "mehndi-baskets" → "Mehndi baskets" for the filter chips. */
const categoryLabel = (slug: string) => slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

/* ------------------------------ Kit section ------------------------------ */

/** Giveaways in the kit: one row each with quantity, plus the way to add more. */
export function KitGiveaways() {
  const { state, gifts } = useKit();
  const guests = guestsOf(state);
  if (getKitCatalog().gifts.length === 0) return null;

  return (
    <section aria-labelledby="kit-gifts">
      {gifts.length > 0 && (
        <>
          <h3 id="kit-gifts" className="eyebrow flex items-center gap-2 text-accent-ink">
            Giveaways
            <span className="text-muted">· {gifts.length}</span>
          </h3>
          <ul className="mb-3 mt-1 divide-y divide-line">
            {gifts.map((g) => (
              <GiftRow key={`${g.product.id}:${g.variant.id}`} line={g} guests={guests} trami={state.trami} />
            ))}
          </ul>
        </>
      )}
      <button
        type="button"
        onClick={openGiftSheet}
        className="flex w-full items-center gap-3 rounded-card border border-dashed border-accent bg-accent-soft/30 px-4 py-3.5 text-left transition-colors hover:border-accent-ink hover:bg-accent-soft/60"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
          <Gift aria-hidden className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{gifts.length ? "Add more giveaways" : "Add giveaways for guests"}</span>
          <span className="block text-[0.8rem] text-muted">Return gifts, favours, chocolates — from our shop, packed with your kit</span>
        </span>
      </button>
    </section>
  );
}

function GiftRow({ line, guests, trami }: { line: GiftLine; guests: number; trami: number }) {
  const { gift, product, variant } = line;
  const max = Math.max(1, Math.min(variant.stock, KIT_MAX_PER_ORDER));
  const hint = gift.qty === guests ? "1 per guest" : gift.qty === trami ? "1 per trami" : null;
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="relative aspect-[4/5] w-12 shrink-0 overflow-hidden rounded-chip bg-surface">
        <Image src={product.image.src} alt="" fill sizes="48px" className="object-cover" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{product.name}</p>
        <p className="truncate text-[0.78rem] text-muted">
          {[variant.label, `${formatUnitPrice(variant.price)} each`, hint].filter(Boolean).join(" · ")}
        </p>
        {line.short && <p className="text-[0.75rem] text-danger">Only {variant.stock} in stock</p>}
        <QuantitySelector
          size="sm"
          className="mt-1.5"
          value={gift.qty}
          max={max}
          onChange={(qty) => setGiftQty(product.id, variant.id, qty)}
          label={`Quantity of ${product.name}`}
        />
      </div>
      <div className="flex flex-col items-end gap-1 self-start">
        <span className="font-medium tabular-nums">{formatKitAmount(line.lineTotal)}</span>
        <button
          type="button"
          aria-label={`Remove ${product.name}`}
          onClick={() => {
            const removed = removeGift(product.id, variant.id);
            toast(`${product.name} removed`, removed && { action: { label: "Undo", onClick: () => restoreGift(removed) } });
          }}
          className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-danger"
        >
          <X className="size-4" />
        </button>
      </div>
    </li>
  );
}

/* ------------------------------ Picker sheet ----------------------------- */

type Basis = "guest" | "trami" | "custom";

/** Pick shop products as giveaways, with how many of each worked out from the guests. */
export function GiveawaySheet() {
  const open = giftSheetStore.useStore();
  const { state, gifts } = useKit();
  const guests = guestsOf(state);
  const [basis, setBasis] = useState<Basis>("guest");
  const [custom, setCustom] = useState(50);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const products = getKitCatalog().gifts;

  const qty = basis === "guest" ? guests : basis === "trami" ? state.trami : custom;
  const categories = [...new Set(products.map((p) => p.categorySlug))];
  const q = query.trim().toLowerCase();
  const shown = products.filter((p) => (category === "all" || p.categorySlug === category) && (!q || p.name.toLowerCase().includes(q)));

  return (
    <Sheet
      open={open}
      onOpenChange={giftSheetStore.set}
      title="Giveaways for your guests"
      description="Return gifts and favours from our shop — packed and delivered with your kit."
      className="sm:max-w-2xl"
      bodyClassName="p-0"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.85rem] text-muted">
            {gifts.length ? (
              <>
                <span className="font-medium text-ink">{gifts.length}</span> in your kit ·{" "}
                <span className="font-medium tabular-nums text-ink">{formatKitAmount(giftsTotal(gifts))}</span>
              </>
            ) : (
              "Nothing added yet"
            )}
          </p>
          <Button onClick={() => giftSheetStore.set(false)}>Done</Button>
        </div>
      }
    >
      <div className="sticky top-0 z-10 space-y-3 border-b border-line bg-canvas px-6 pb-4 pt-4">
        <fieldset>
          <legend className="mb-2 text-[0.82rem] font-medium">How many of each?</legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["guest", "1 per guest", guests],
                ["trami", "1 per trami", state.trami],
                ["custom", "Custom", null],
              ] as const
            )
              // Counting by guests there are no trami to count by.
              .filter(([id]) => !(state.guests && id === "trami"))
              .map(([id, label, n]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={basis === id}
                  onClick={() => setBasis(id)}
                  className="flex min-h-14 flex-col items-start justify-center rounded-control border border-line-strong bg-raised px-3 py-2 text-left transition-colors hover:border-ink aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink"
                >
                  <span className="text-[0.8rem] font-medium">{label}</span>
                  {n !== null && <span className="text-[0.75rem] tabular-nums opacity-80">{n} pcs</span>}
                  {n === null && basis !== "custom" && <span className="text-[0.75rem] opacity-80">Any number</span>}
                </button>
              ))}
          </div>
          {basis === "custom" && (
            <div className="mt-2 flex items-center gap-3">
              <QuantitySelector size="sm" value={custom} onChange={setCustom} max={KIT_MAX_PER_ORDER} label="Giveaways of each" />
              <span className="text-[0.8rem] text-muted">of each giveaway</span>
            </div>
          )}
        </fieldset>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search giveaways</span>
            <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hampers, favours, chocolates…"
              className="h-11 w-full rounded-full border border-line-strong bg-raised pl-10 pr-4 text-sm outline-none focus:border-ink"
            />
          </label>
        </div>
        {categories.length > 1 && (
          <div role="group" aria-label="Category" className="scrollbar-none -mx-6 flex gap-2 overflow-x-auto px-6">
            {["all", ...categories].map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className="h-9 shrink-0 rounded-full border border-line-strong px-3.5 text-[0.8rem] transition-colors hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-canvas"
              >
                {c === "all" ? "All" : categoryLabel(c)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-5">
        {shown.length === 0 ? (
          <p className="py-10 text-center text-[0.9rem] text-muted">No products match — try another word or category.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {shown.map((p) => (
              <GiftCard key={p.id} product={p} qty={qty} lines={gifts} />
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}

function GiftCard({ product, qty, lines }: { product: GiftProduct; qty: number; lines: GiftLine[] }) {
  const firstInStock = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstInStock.id);
  const variant = product.variants.find((v) => v.id === variantId) ?? firstInStock;
  const inKit = lines.find((l) => l.product.id === product.id && l.variant.id === variant.id);
  const otherInKit = !inKit && lines.find((l) => l.product.id === product.id);
  const amount = Math.min(qty, variant.stock);

  const add = () => {
    if (otherInKit) {
      setGiftVariant(product.id, otherInKit.variant.id, variant.id);
      toast.success(`${product.name} changed to ${variant.label}`);
      return;
    }
    const result = addGift(product.id, variant.id, amount);
    if (result === "full") toast.error("That's the most giveaways one kit can hold. Remove one first.");
    else if (result === "added")
      toast.success(`${amount} × ${product.name} added`, {
        description: amount < qty ? `Only ${variant.stock} in stock right now.` : "Change the quantity in your kit any time.",
      });
  };

  return (
    <li className="flex flex-col">
      <span className={cn("relative block aspect-[4/5] overflow-hidden rounded-card bg-surface", inKit && "ring-2 ring-brand")}>
        <Image src={product.image.src} alt={product.image.alt} fill sizes="(min-width: 640px) 13rem, 45vw" className="object-cover" />
        {inKit && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[0.7rem] font-medium text-brand-ink">
            <Check className="size-3" /> In kit · {inKit.gift.qty}
          </span>
        )}
      </span>
      <p className="mt-2 line-clamp-2 text-[0.88rem] font-medium leading-snug">{product.name}</p>
      {product.variants.length > 1 && (
        <select
          aria-label={`Option for ${product.name}`}
          value={variant.id}
          onChange={(e) => setVariantId(e.target.value)}
          className="mt-1.5 h-9 w-full rounded-control border border-line-strong bg-raised px-2 text-[0.8rem]"
        >
          {product.variants.map((v) => (
            <option key={v.id} value={v.id} disabled={v.stock <= 0}>
              {v.label || "Standard"}
              {v.stock <= 0 ? " — out of stock" : ""}
            </option>
          ))}
        </select>
      )}
      <p className="mt-1 text-[0.8rem] tabular-nums text-muted">
        {formatUnitPrice(variant.price)} each
        {variant.stock > 0 && !inKit && <span className="text-ink"> · {formatKitAmount(variant.price * amount)}</span>}
      </p>
      <div className="mt-auto pt-2">
        {variant.stock <= 0 ? (
          <p className="py-2 text-[0.8rem] text-muted">Out of stock</p>
        ) : inKit ? (
          <button
            type="button"
            onClick={() => removeGift(product.id, variant.id)}
            className="h-10 w-full rounded-full border border-line-strong text-[0.75rem] font-medium uppercase tracking-[0.08em] transition-colors hover:border-danger hover:text-danger"
          >
            Remove
          </button>
        ) : (
          <button
            type="button"
            onClick={add}
            aria-label={`Add ${amount} ${product.name}`}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-[0.75rem] font-medium uppercase tracking-[0.08em] text-brand-ink transition-colors hover:bg-brand-deep"
          >
            <Plus className="size-3.5" /> {otherInKit ? "Switch to this" : `Add ${amount}`}
          </button>
        )}
        {variant.stock > 0 && variant.stock < qty && !inKit && (
          <p className="mt-1 text-[0.72rem] text-danger">Only {variant.stock} in stock</p>
        )}
      </div>
    </li>
  );
}
