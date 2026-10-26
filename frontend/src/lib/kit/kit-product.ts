import type { ImageAsset, Paise, Product, ProductKitInfo, ProductStatus } from "../types";
import { slugify } from "../utils";
import { KIT_MAX_PER_ORDER, kitItems, type KitCategory, type KitItem, type Occasion } from "./config";

/**
 * Kit products in the admin: a catalogue Product plus `kit` info. These
 * helpers turn one into an editable draft and back, and validate it.
 * Pure — shared by the admin UI and the tests.
 */

export interface KitOptionDraft {
  name: string;
  price: Paise;
  stock: number;
  /** Kept so existing variant ids (and carts that reference them) survive edits. */
  variantId?: string;
  /** Photos of this option (e.g. the wooden spoon), first one leading; shown when shoppers pick it. */
  photos?: ImageAsset[];
}

export interface KitProductDraft {
  /** Empty for a new kit product. */
  id: string;
  itemId: string;
  name: string;
  category: KitCategory;
  perTrami: number;
  /** null = every function. */
  occasions: Occasion[] | null;
  optionName: string;
  options: KitOptionDraft[];
  status: ProductStatus;
  /** Which illustration to show when there's no photo (an existing kit item id). */
  imageId: string;
  /** Photos of the item itself, first one leading; they take the place of the illustration. */
  photos: ImageAsset[];
}

export type KitDraftErrors = Partial<Record<"name" | "perTrami" | "occasions" | "optionName" | "options", string>>;

const DEFAULT_STOCK = 20000;

/** Kit products carry `kit`; older saved demo data may not, so fall back to the config by id. */
export function kitInfoOf(p: Product): ProductKitInfo | null {
  if (p.kit) return p.kit;
  if (!p.id.startsWith("kit_")) return null;
  const item = kitItems.find((i) => i.id === p.id.slice(4));
  return item
    ? { itemId: item.id, category: item.category, perTrami: item.perTrami, ...(item.occasions && { occasions: item.occasions }) }
    : null;
}

export const isKitProduct = (p: Product) => kitInfoOf(p) !== null;

export function kitIllustration(imageId: string, name: string): ImageAsset {
  return { src: `/images/kit/${imageId}.svg`, alt: `${name} illustration`, width: 400, height: 500 };
}

/** Illustrations staff can pick for a kit product. */
export const kitIllustrations = kitItems.map((i) => ({ id: i.id, label: i.name }));

export function blankKitDraft(): KitProductDraft {
  return {
    id: "",
    itemId: "",
    name: "",
    category: "serving",
    perTrami: 1,
    occasions: null,
    optionName: "Type",
    options: [{ name: "", price: 0, stock: DEFAULT_STOCK }],
    status: "active",
    imageId: "dastarkhan",
    photos: [],
  };
}

export function draftFromProduct(p: Product): KitProductDraft {
  const kit = kitInfoOf(p);
  const optionName = p.options[0]?.name ?? "Type";
  // Images an option claims are that option's photos; the rest belong to the item.
  const owned = new Set(p.variants.flatMap((v) => v.imageIndexes ?? (v.imageIndex ? [v.imageIndex] : [])));
  const illustration = p.images.map((img) => img.src.match(/\/images\/kit\/([a-z0-9-]+)\.svg$/)?.[1]).find(Boolean);
  const photos = p.images.filter((img, i) => !owned.has(i) && !img.src.match(/\/images\/kit\/[a-z0-9-]+\.svg$/));
  const itemId = kit?.itemId ?? p.id.replace(/^kit_/, "");
  return {
    id: p.id,
    itemId,
    name: p.name,
    category: kit?.category ?? "serving",
    perTrami: kit?.perTrami ?? 1,
    occasions: kit?.occasions ?? null,
    optionName,
    options: p.variants.map((v) => {
      const indexes = v.imageIndexes ?? (v.imageIndex ? [v.imageIndex] : []);
      const own = indexes.filter((i) => i > 0).flatMap((i) => (p.images[i] ? [p.images[i]] : []));
      return {
        name: v.options[optionName] ?? Object.values(v.options)[0] ?? "",
        price: v.price,
        stock: v.stock,
        variantId: v.id,
        ...(own.length && { photos: own }),
      };
    }),
    status: p.status,
    imageId: illustration ?? (kitIllustrations.some((i) => i.id === itemId) ? itemId : "dastarkhan"),
    photos,
  };
}

export function validateKitDraft(d: KitProductDraft, takenItemIds: string[] = []): KitDraftErrors {
  const errors: KitDraftErrors = {};
  if (!d.name.trim()) errors.name = "Give the item a name.";
  else if (!d.id && takenItemIds.includes(itemIdFor(d))) errors.name = "A kit product with this name already exists.";
  if (!(d.perTrami > 0) || d.perTrami > 100) errors.perTrami = "Enter how many are needed per trami (more than 0, up to 100).";
  if (d.occasions && d.occasions.length === 0) errors.occasions = "Pick at least one function, or choose “All functions”.";
  if (!d.optionName.trim()) errors.optionName = "Name the choice, e.g. Type or Size.";
  if (d.options.length === 0) errors.options = "Add at least one option.";
  else if (d.options.some((o) => !o.name.trim())) errors.options = "Every option needs a name.";
  else if (new Set(d.options.map((o) => o.name.trim().toLowerCase())).size !== d.options.length)
    errors.options = "Option names must be different.";
  else if (d.options.some((o) => !(o.price > 0))) errors.options = "Every option needs a price above ₹0.";
  else if (d.options.some((o) => !Number.isInteger(o.stock) || o.stock < 0)) errors.options = "Stock must be a whole number (0 or more).";
  return errors;
}

/** Short engine id from the name: "Paper glass (kahwa)" → "paper-glass-kahwa". Kept stable once created. */
export function itemIdFor(d: KitProductDraft): string {
  return d.itemId || slugify(d.name).slice(0, 20).replace(/-+$/, "");
}

export function productFromDraft(d: KitProductDraft, existing?: Product): Product {
  const itemId = itemIdFor(d);
  const id = d.id || `kit_${itemId}`;
  const sku = existing?.sku ?? `EE-KIT-${itemId.toUpperCase()}`;
  const name = d.name.trim();
  const optionName = d.optionName.trim();
  const usedIds = new Set(d.options.map((o) => o.variantId).filter(Boolean));
  let next = 1;
  const freshId = () => {
    while (usedIds.has(`kit-${itemId}-v${next}`)) next++;
    const vid = `kit-${itemId}-v${next++}`;
    usedIds.add(vid);
    return vid;
  };
  const per = d.perTrami >= 1 ? `${d.perTrami} per trami` : `1 per ${Math.round(1 / d.perTrami)} trami`;

  // The item's own photos (or its illustration) first, then each option's photos (each stored once).
  const images: ImageAsset[] = d.photos.length
    ? d.photos.map((ph) => ({ ...ph, alt: ph.alt.trim() || name }))
    : [kitIllustration(d.imageId, name)];
  const itemImageCount = images.length;
  const indexOf = (photo: ImageAsset, optionName: string): number => {
    const found = images.findIndex((img, i) => i >= itemImageCount && img.src === photo.src);
    if (found >= 0) return found;
    images.push({ ...photo, alt: photo.alt.trim() || `${name} — ${optionName}` });
    return images.length - 1;
  };
  const variants = d.options.map((o, i) => {
    const indexes = [...new Set((o.photos ?? []).map((photo) => indexOf(photo, o.name.trim())))];
    return {
      id: o.variantId ?? freshId(),
      sku: `${sku}-${String(i + 1).padStart(2, "0")}`,
      options: { [optionName]: o.name.trim() },
      price: Math.round(o.price),
      stock: o.stock,
      ...(indexes.length && { imageIndex: indexes[0], imageIndexes: indexes }),
    };
  });

  return {
    ...(existing ?? {
      careInfo: undefined,
      isFeatured: false,
      isNewArrival: false,
      salesCount: 0,
      createdAt: new Date().toISOString(),
    }),
    id,
    slug: existing?.slug ?? slugify(name),
    sku,
    name,
    shortDescription:
      existing?.shortDescription ?? `Wedding ${name.toLowerCase()} in ${d.options.length} options, sold loose in any quantity.`,
    description: existing?.description ?? [
      `${name} for Kashmiri wedding functions. A trami seats four guests — we usually suggest ${per}.`,
    ],
    categorySlug: "decorative-disposables",
    images,
    options: [{ name: optionName, values: d.options.map((o) => o.name.trim()) }],
    variants,
    attributes: { ...(existing?.attributes ?? {}), "Suggested quantity": per, Sold: "Per piece" },
    kit: { itemId, category: d.category, perTrami: d.perTrami, ...(d.occasions && { occasions: d.occasions }) },
    maxPerOrder: KIT_MAX_PER_ORDER,
    status: d.status,
  };
}

/** The draft as a kit-engine item, for previews ("50 trami → 200 pcs, Standard picks …"). */
export function kitItemFromDraft(d: KitProductDraft): KitItem {
  return {
    id: itemIdFor(d) || "preview",
    name: d.name.trim() || "New item",
    category: d.category,
    perTrami: d.perTrami > 0 ? d.perTrami : 1,
    ...(d.occasions && { occasions: d.occasions }),
    optionName: d.optionName,
    variants: d.options.length ? d.options.map((o) => ({ name: o.name || "Option", price: o.price })) : [{ name: "Option", price: 0 }],
  };
}
