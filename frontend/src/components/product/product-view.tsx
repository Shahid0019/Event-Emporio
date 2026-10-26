"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Gift, Info, Maximize2, Package, ShieldCheck } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Price } from "@/components/ui/primitives";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { WishlistButton } from "./product-card";
import { useStoreSettings } from "@/components/providers/store-data";
import { storeSettings } from "@/lib/data/settings";
import { lineCap } from "@/lib/pricing";
import { addToCart, cartStore, openCart, rememberViewed } from "@/lib/store";
import type { ImageAsset, Product, ProductVariant } from "@/lib/types";
import { cn, formatPrice, variantLabel } from "@/lib/utils";

const LOW_STOCK = 5;

function findVariant(product: Product, selected: Record<string, string>): ProductVariant | undefined {
  return product.variants.find((v) => product.options.every((o) => v.options[o.name] === selected[o.name]));
}

function initialSelection(product: Product): Record<string, string> {
  const preferred = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  return { ...preferred.options };
}

export function ProductView({ product, categoryName }: { product: Product; categoryName: string }) {
  const settings = useStoreSettings();
  const [selected, setSelected] = useState(() => initialSelection(product));
  const [quantity, setQuantity] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const [giftMessage, setGiftMessage] = useState("");
  const [showSticky, setShowSticky] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const variant = findVariant(product, selected);
  const stock = variant?.stock ?? 0;
  const gallery = galleryFor(product, variant);
  // Already in the bag counts towards the limit, so the stepper stops where adding would.
  const inBag = cartStore.useStore(
    (lines) => lines.find((l) => !l.bundle && variant && l.key === `${product.id}:${variant.id}`)?.quantity ?? 0,
  );
  const cap = lineCap(stock, product.maxPerOrder);
  const canAdd = Math.max(0, cap - inBag);
  const maxQty = Math.max(1, canAdd);
  const qty = Math.min(quantity, maxQty);
  const prices = product.variants.map((v) => v.price);

  useEffect(() => {
    rememberViewed(product.slug);
  }, [product.slug]);

  // Sticky purchase bar on small screens, only once the main button has scrolled away.
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    // A scroll check (rather than IntersectionObserver) also handles jumps straight back to the top.
    const update = () => setShowSticky(el.getBoundingClientRect().bottom < 0);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const choose = (name: string, value: string) => {
    const next = { ...selected, [name]: value };
    setSelected(next);
    setQuantity(1);
    const v = findVariant(product, next);
    // Options with their own photo set start their gallery from its first photo.
    if (hasPhotoSets(product)) setImageIndex(0);
    else if (v?.imageIndex !== undefined) setImageIndex(v.imageIndex);
  };

  /** A value is selectable if some in-stock variant has it together with the other current choices. */
  const valueAvailable = (name: string, value: string) =>
    product.variants.some(
      (v) =>
        v.stock > 0 && v.options[name] === value && product.options.every((o) => o.name === name || v.options[o.name] === selected[o.name]),
    );

  const add = (thenCheckout = false) => {
    if (!variant || stock <= 0) return;
    const added = addToCart({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      categorySlug: product.categorySlug,
      variantLabel: variantLabel(variant.options),
      image: product.images[variant.imageIndex ?? 0],
      unitPrice: variant.price,
      compareAtPrice: variant.compareAtPrice,
      quantity: qty,
      maxQuantity: variant.stock,
      maxPerOrder: product.maxPerOrder,
      giftMessage: giftMessage.trim() || undefined,
    });
    if (thenCheckout) {
      router.push("/checkout");
      return;
    }
    if (added === 0) {
      toast.error("You already have all available stock in your bag");
    } else {
      toast.success(`${product.name} added to your bag`, {
        description: added < qty ? `Only ${added} more could be added.` : variantLabel(variant.options) || undefined,
        action: { label: "View bag", onClick: openCart },
      });
    }
  };

  const stockLabel = !variant ? "Unavailable" : stock <= 0 ? "Out of stock" : stock <= LOW_STOCK ? `Low stock — ${stock} left` : "In stock";

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
      <Gallery name={product.name} images={gallery} index={Math.min(imageIndex, gallery.length - 1)} onIndexChange={setImageIndex} />

      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <p className="eyebrow text-accent-ink">
            <Link href={`/category/${product.categorySlug}`} className="hover:text-ink">
              {categoryName}
            </Link>
          </p>
          <h1 className="mt-3 text-[clamp(2.1rem,1.6rem+2vw,3.25rem)] leading-[1.05]">{product.name}</h1>

          <div className="mt-5">
            {variant ? (
              <Price price={variant.price} compareAtPrice={variant.compareAtPrice} size="lg" />
            ) : (
              <p className="text-2xl">
                {formatPrice(Math.min(...prices))} – {formatPrice(Math.max(...prices))}
              </p>
            )}
            {storeSettings.pricesIncludeTax && <p className="mt-1 text-[0.78rem] text-muted">Inclusive of all taxes</p>}
          </div>

          <p className="mt-6 text-[1.02rem] leading-relaxed text-muted">{product.shortDescription}</p>

          {product.options.map((option) => (
            <fieldset key={option.name} className="mt-8">
              <legend className="mb-3 flex w-full justify-between text-[0.8rem]">
                <span className="font-medium uppercase tracking-[0.14em]">{option.name}</span>
                <span className="text-muted">{selected[option.name]}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const active = selected[option.name] === value;
                  const available = valueAvailable(option.name, value);
                  const thumb = optionThumb(product, option.name, value);
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => choose(option.name, value)}
                      className={cn(
                        "relative inline-flex h-11 min-w-[3.25rem] items-center gap-2 rounded-full border px-4 text-[0.85rem] transition-colors",
                        thumb && "pl-1.5",
                        active ? "border-ink bg-ink text-canvas" : "border-line-strong bg-raised hover:border-ink",
                        !available && !active && "text-muted line-through decoration-muted/60",
                      )}
                    >
                      {thumb && (
                        <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-surface">
                          <Image src={thumb.src} alt="" fill sizes="32px" className="object-cover" />
                        </span>
                      )}
                      {value}
                      {!available && <span className="sr-only"> (sold out)</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <p className={cn("mt-6 flex items-center gap-2 text-[0.85rem]", stock > 0 ? "text-success" : "text-danger")}>
            <span aria-hidden className={cn("size-1.5 rounded-full", stock > 0 ? "bg-success" : "bg-danger")} />
            {stockLabel}
          </p>

          {product.customization?.giftMessage && stock > 0 && (
            <div className="mt-6">
              <label htmlFor="gift-message" className="mb-2 flex items-center gap-2 text-[0.8rem] font-medium">
                <Gift className="size-4" /> Gift message <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="gift-message"
                value={giftMessage}
                maxLength={200}
                onChange={(e) => setGiftMessage(e.target.value)}
                rows={2}
                placeholder="Write a note to include with this gift"
                className="w-full resize-none rounded-control border border-line-strong bg-raised px-4 py-3 text-[0.92rem] placeholder:text-muted/70 focus:border-ink focus:outline-none"
              />
              <p className="mt-1 text-right text-[0.72rem] text-muted">{giftMessage.length}/200</p>
            </div>
          )}

          <div ref={buyRef} className="mt-6 flex flex-wrap gap-3">
            <QuantitySelector value={qty} onChange={setQuantity} max={maxQty} />
            <Button size="lg" className="min-w-[12rem] flex-1" disabled={stock <= 0 || canAdd === 0} onClick={() => add()}>
              {stock <= 0 ? "Sold out" : canAdd === 0 ? "Max in your bag" : "Add to bag"}
            </Button>
            <WishlistButton
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                image: product.images[0],
                price: variant?.price ?? Math.min(...prices),
              }}
              className="size-14 border border-line-strong bg-raised"
            />
          </div>
          <p aria-live="polite" className="mt-3 text-[0.82rem] leading-relaxed text-muted empty:hidden">
            {stock > 0 && qty >= maxQty && <LimitNote cap={cap} stock={stock} inBag={inBag} canAdd={canAdd} />}
          </p>
          {stock > 0 && (
            <Button variant="secondary" size="lg" className="mt-3 w-full" onClick={() => add(true)}>
              Buy now
            </Button>
          )}
          {stock <= 0 && (
            <p className="mt-4 text-[0.88rem] text-muted">
              This option is currently unavailable.{" "}
              <Link href="/contact" className="underline underline-offset-4 hover:text-ink">
                Ask us about restocking
              </Link>
              .
            </p>
          )}

          {product.customization?.quoteOnRequest && (
            <div className="mt-6 rounded-control border-l-2 border-accent bg-surface px-5 py-4 text-[0.88rem] leading-relaxed">
              Need personalisation or larger quantities?{" "}
              <Link href={`/custom-orders?product=${product.slug}`} className="font-medium underline underline-offset-4">
                Request a quote
              </Link>{" "}
              — custom work is priced to your brief.
            </div>
          )}

          <ul className="mt-8 space-y-3 border-t border-line pt-6 text-[0.85rem] text-muted">
            <li className="flex gap-3">
              <Package className="size-4 shrink-0 translate-y-0.5 text-ink" />
              {settings.shipping.freeShippingThreshold !== null
                ? `Free shipping on orders over ${formatPrice(settings.shipping.freeShippingThreshold)}. Dispatch timeline confirmed after ordering.`
                : "Dispatch timeline confirmed after ordering."}
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="size-4 shrink-0 translate-y-0.5 text-ink" />
              Secure checkout via Razorpay. We never store card details.
            </li>
          </ul>

          <Accordion
            className="mt-8"
            defaultValue="description"
            items={[
              {
                id: "description",
                title: "Description",
                content: product.description.map((p) => (
                  <p key={p} className="mb-3 last:mb-0">
                    {p}
                  </p>
                )),
              },
              {
                id: "specs",
                title: "Specifications",
                content: (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
                    {Object.entries(product.attributes).map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-ink">{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                    <dt className="text-ink">SKU</dt>
                    <dd>{variant?.sku ?? product.sku}</dd>
                  </dl>
                ),
              },
              ...(product.careInfo ? [{ id: "care", title: "Care", content: <p>{product.careInfo}</p> }] : []),
              {
                id: "shipping",
                title: "Shipping & returns",
                content: (
                  <p>
                    Delivery charges are calculated at checkout. Read our{" "}
                    <Link href="/shipping-policy" className="underline underline-offset-4">
                      shipping policy
                    </Link>{" "}
                    and{" "}
                    <Link href="/returns-policy" className="underline underline-offset-4">
                      returns policy
                    </Link>{" "}
                    for details.
                  </p>
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* Mobile sticky purchase bar */}
      <div
        aria-hidden={!showSticky}
        className={cn(
          "fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 rounded-full border border-line bg-canvas/95 py-2 pl-5 pr-2 shadow-[0_15px_40px_-15px_rgb(36_32_32/0.45)] backdrop-blur transition-transform duration-500 ease-[var(--ease-luxe)] lg:hidden",
          showSticky ? "translate-y-0" : "pointer-events-none translate-y-[calc(100%+2rem)]",
        )}
      >
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-lg leading-tight">{product.name}</p>
            <p className="text-[0.85rem]">{variant ? formatPrice(variant.price) : ""}</p>
          </div>
          <Button tabIndex={showSticky ? 0 : -1} disabled={stock <= 0 || canAdd === 0} onClick={() => add()}>
            {stock <= 0 ? "Sold out" : canAdd === 0 ? "Max in your bag" : "Add to bag"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Why the quantity stops where it does: stock, the per-order cap, or what's already in the bag. */
function LimitNote({ cap, stock, inBag, canAdd }: { cap: number; stock: number; inBag: number; canAdd: number }) {
  const byStock = cap === stock;
  const message =
    canAdd === 0
      ? `You have ${inBag} in your bag — the most you can order${byStock ? ` (only ${stock} in stock)` : ""}.`
      : inBag > 0
        ? `You can add ${canAdd} more — ${inBag} already in your bag${byStock ? ` (only ${stock} in stock)` : ""}.`
        : byStock
          ? `Only ${stock} in stock — that's the most you can add.`
          : `You can order up to ${cap} at a time.`;
  return (
    <span className="flex items-start gap-2 text-red-700">
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {message}
        {!byStock && (
          <>
            {" "}
            <Link href="/custom-orders" className="underline underline-offset-4 hover:text-ink">
              Need more? Ask about bulk orders
            </Link>
          </>
        )}
      </span>
    </span>
  );
}

/** True when the product's options have their own photo sets (kit products with option photos). */
const hasPhotoSets = (product: Product) => product.variants.some((v) => ownImages(product, v).length);

/** A variant's own photos; kit products saved before photo sets carry just `imageIndex`. */
const ownImages = (product: Product, v: ProductVariant): number[] => v.imageIndexes ?? (product.kit && v.imageIndex ? [v.imageIndex] : []);

/**
 * The images to show for the chosen option. With per-option photo sets: that
 * option's photos first, then the product's general pictures; an option with
 * no photos shows just the general pictures. Otherwise every image.
 */
function galleryFor(product: Product, variant: ProductVariant | undefined): ImageAsset[] {
  if (!hasPhotoSets(product)) return product.images;
  const owned = new Set(product.variants.flatMap((v) => ownImages(product, v)));
  const general = product.images.filter((_, i) => !owned.has(i));
  const own = (variant ? ownImages(product, variant) : []).flatMap((i) => (product.images[i] ? [product.images[i]] : []));
  const list = [...own, ...general];
  return list.length ? list : product.images.slice(0, 1);
}

/** The first photo of the option with this value, for single-choice products with photo sets. */
function optionThumb(product: Product, optionName: string, value: string): ImageAsset | undefined {
  if (!hasPhotoSets(product) || product.options.length !== 1) return undefined;
  const v = product.variants.find((x) => x.options[optionName] === value);
  const first = v ? ownImages(product, v)[0] : undefined;
  return first !== undefined ? product.images[first] : undefined;
}

function Gallery({
  name,
  images,
  index,
  onIndexChange,
}: {
  name: string;
  images: ImageAsset[];
  index: number;
  onIndexChange: (i: number) => void;
}) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState(false);
  const image = images[index] ?? images[0];

  return (
    <div className="lg:col-span-7">
      <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
        {images.length > 1 && (
          <ul className="scrollbar-none flex gap-2 overflow-x-auto md:w-20 md:shrink-0 md:flex-col md:gap-3" aria-label="Product images">
            {images.map((img, i) => (
              <li key={img.src + i} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onIndexChange(i)}
                  aria-label={`Show image ${i + 1} of ${images.length}`}
                  aria-current={i === index}
                  className={cn(
                    "relative block aspect-[4/5] w-16 overflow-hidden rounded-control bg-surface transition-opacity md:w-full",
                    i === index ? "outline outline-1 outline-offset-2 outline-ink" : "opacity-60 hover:opacity-100",
                  )}
                >
                  <Image src={img.src} alt="" fill sizes="80px" loading={i === 0 ? "eager" : "lazy"} className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div
          className="group relative isolate aspect-[4/5] flex-1 cursor-zoom-in overflow-hidden rounded-media bg-surface"
          onPointerMove={(e) => {
            if (e.pointerType !== "mouse") return;
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
          onPointerLeave={() => setZoom(null)}
          onClick={() => setLightbox(true)}
        >
          <Image
            key={image.src}
            src={image.src}
            alt={image.alt}
            fill
            loading={index === 0 ? "eager" : "lazy"}
            fetchPriority={index === 0 ? "high" : "auto"}
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="animate-[fade_.6s_ease-out] object-cover transition-transform duration-300 ease-out"
            style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(true);
            }}
            aria-label="View image full screen"
            className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-canvas/85 backdrop-blur transition-colors hover:bg-canvas"
          >
            <Maximize2 className="size-4" />
          </button>
        </div>
      </div>

      <Sheet open={lightbox} onOpenChange={setLightbox} title={name} side="center" className="max-w-4xl" bodyClassName="p-0">
        <div className="relative aspect-[4/5] max-h-[78dvh] w-full overflow-hidden rounded-card bg-surface sm:aspect-[4/3]">
          <Image src={image.src} alt={image.alt} fill sizes="90vw" className="object-contain" />
        </div>
      </Sheet>
    </div>
  );
}
