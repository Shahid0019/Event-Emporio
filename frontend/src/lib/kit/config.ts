import { demoImage } from "../data/images";
import type { ImageAsset, Paise } from "../types";
import { rupeesToPaise } from "../utils";

/**
 * KIT BUILDER CONFIG — the single place the shop owner tunes the kit.
 * Per-trami ratios, occasions, tier defaults and prices all live here;
 * the kit products in the catalogue are generated from this list, so a
 * price changed here changes on the product page, in the cart and at
 * checkout too. A future admin panel will edit this data.
 *
 * DEMO PRICES — every price below is an illustrative placeholder and must
 * be confirmed by Events Emporio before launch.
 *
 * A "trami" is one large shared plate that seats four guests.
 */

export const GUESTS_PER_TRAMI = 4;

/**
 * A function's id ("wazwan", "engagement"…). Functions are created by the
 * shop in Admin → Functions; `CUSTOM_FUNCTION` is a shopper's own function
 * that isn't on the shop's list (it gets the everyday items only).
 */
export type Occasion = string;
export const CUSTOM_FUNCTION = "other";
/** Function ids are short slugs, used in links: /kit?occasion=<id>. */
export const FUNCTION_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const FUNCTION_ID_MAX = 40;
/** Longest name a shopper (or the shop) can give a function. */
export const FUNCTION_TITLE_MAX = 60;

export const TIER_IDS = ["basic", "standard", "premium"] as const;
export type Tier = (typeof TIER_IDS)[number];

export const KIT_CATEGORY_IDS = ["serving", "drinking", "packing", "cleaning", "extras"] as const;
export type KitCategory = (typeof KIT_CATEGORY_IDS)[number];

export const DATE_IDS = ["this-week", "two-weeks", "next-month", "undecided"] as const;
export type FunctionDate = (typeof DATE_IDS)[number];

/** A function the shop offers in the kit builder (Admin → Functions). */
export interface KitFunction {
  id: Occasion;
  name: string;
  /** One short line under the name: "Main wedding feast", "Adds potli". */
  description: string;
  /** Kit item whose picture stands for this function. */
  icon?: string;
  /** Photo for the home page "Which function is it for?" cards. */
  image?: ImageAsset;
  /** Hidden functions stay on old kits but aren't offered to new ones. */
  isActive: boolean;
  sortOrder: number;
}

/** DEMO starting functions — copied into the database once; the shop edits them in the admin. */
export const starterFunctions: KitFunction[] = [
  {
    id: "wazwan",
    name: "Wazwan",
    description: "Main wedding feast",
    icon: "dastarkhan",
    image: demoImage("dinner-table", "Long dinner table set for a feast"),
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "nikkah",
    name: "Nikkah",
    description: "Adds potli",
    icon: "potli",
    image: demoImage("mehndi-rings", "Hennaed hands with wedding rings"),
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "mehndi",
    name: "Mehndi raat",
    description: "Adds cones & cake items",
    icon: "mehndi",
    image: demoImage("mehndi-hands", "Hands decorated with intricate henna"),
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "walima",
    name: "Walima",
    description: "Adds cake items",
    icon: "cakeplate",
    image: demoImage("candlelit-table", "Candlelit reception table"),
    isActive: true,
    sortOrder: 4,
  },
];

export const tiers: { id: Tier; name: string; description: string }[] = [
  { id: "basic", name: "Basic", description: "Simple, sturdy essentials" },
  { id: "standard", name: "Standard", description: "What most families choose" },
  { id: "premium", name: "Premium", description: "Our finest variants" },
];

export const functionDates: { id: FunctionDate; label: string }[] = [
  { id: "this-week", label: "This week" },
  { id: "two-weeks", label: "In 2 weeks" },
  { id: "next-month", label: "Next month" },
  { id: "undecided", label: "Not decided yet" },
];

export const kitCategories: { id: KitCategory; label: string }[] = [
  { id: "serving", label: "Serving" },
  { id: "drinking", label: "Drinking" },
  { id: "packing", label: "Take-home packing" },
  { id: "cleaning", label: "Napkins & cleaning" },
  { id: "extras", label: "Extras" },
];

export interface KitVariant {
  name: string;
  price: Paise;
}

export interface KitItem {
  id: string;
  name: string;
  category: KitCategory;
  /** Units needed for one trami (four guests). Fractions mean "1 per N trami". */
  perTrami: number;
  /** Function ids that include this item; omit for items every function needs. */
  occasions?: Occasion[];
  /** Label for the variant choice on the product page. */
  optionName: string;
  /** Ordered cheapest-first-ish: basic picks the first, premium the last. */
  variants: KitVariant[];
}

const rs = rupeesToPaise;
const v = (name: string, rupees: number): KitVariant => ({ name, price: rs(rupees) });

export const kitItems: KitItem[] = [
  /* Serving */
  {
    id: "dastarkhan",
    name: "Dastarkhan",
    category: "serving",
    perTrami: 1,
    optionName: "Size",
    variants: [v("Small", 15), v("Medium", 22), v("Large", 30), v("Extra large", 38)],
  },
  {
    id: "salad",
    name: "Salad plate",
    category: "serving",
    perTrami: 1,
    optionName: "Type",
    variants: [v("Plastic", 6), v("Bio", 9), v("3 in 1", 12), v("4 in 1", 15), v("5 in 1", 18)],
  },
  { id: "gostab", name: "Gostab bowl", category: "serving", perTrami: 4, optionName: "Type", variants: [v("Plastic", 2), v("Bio", 3.5)] },
  {
    id: "spoon",
    name: "Spoon",
    category: "serving",
    perTrami: 4,
    optionName: "Type",
    variants: [v("Plastic small", 1), v("Plastic medium", 1.5), v("Wooden small", 2), v("Wooden large", 3)],
  },
  { id: "knife", name: "Knife", category: "serving", perTrami: 1, optionName: "Type", variants: [v("Plastic", 1.5), v("Wooden", 2)] },

  /* Drinking */
  {
    id: "wglass",
    name: "Water glass",
    category: "drinking",
    perTrami: 4,
    optionName: "Type",
    variants: [v("Normal", 1.5), v("Crystal", 3), v("Special shake", 4)],
  },
  {
    id: "pglass",
    name: "Paper glass (kahwa)",
    category: "drinking",
    perTrami: 4,
    optionName: "Type",
    variants: [v("Normal", 1), v("Ripple", 2), v("Special DW", 2.5)],
  },

  /* Take-home packing */
  {
    id: "box",
    name: "Take-home box",
    category: "packing",
    perTrami: 1,
    optionName: "Type",
    variants: [v("Carpet", 12), v("3D box", 18), v("Window", 22), v("Steel basket", 35)],
  },
  {
    id: "outer",
    name: "Outer bag",
    category: "packing",
    perTrami: 1,
    optionName: "Type",
    variants: [v("Normal", 3), v("Sil/gol loop", 6), v("Paper bag", 10), v("Laminated loop", 9), v("Laminated croc", 12)],
  },
  {
    id: "inner",
    name: "Inner bag",
    category: "packing",
    perTrami: 2,
    optionName: "Type",
    variants: [v("Normal", 1), v("Large with lock", 2), v("XL with lock", 3)],
  },
  {
    id: "passpass",
    name: "Pass-pass bag",
    category: "packing",
    perTrami: 1,
    optionName: "Type",
    variants: [v("Non wet", 2), v("Wet", 3), v("Wet special", 4), v("Customized", 6)],
  },
  {
    id: "zip",
    name: "Zip lock",
    category: "packing",
    perTrami: 1,
    optionName: "Type",
    variants: [v("Medium", 2), v("Large", 3), v("D cut", 4)],
  },
  {
    id: "foil",
    name: "Aluminium foil",
    category: "packing",
    perTrami: 0.1,
    optionName: "Roll",
    variants: [v("Small roll", 60), v("500 g roll", 180)],
  },

  /* Napkins & cleaning */
  {
    id: "napkin",
    name: "Napkin",
    category: "cleaning",
    perTrami: 4,
    optionName: "Type",
    variants: [v("Normal", 0.5), v("Plate napkin", 1.5), v("Printed", 1.2), v("Crafted", 2)],
  },
  {
    id: "tissue",
    name: "Tissue box",
    category: "cleaning",
    perTrami: 0.5,
    optionName: "Type",
    variants: [v("Small plastic", 20), v("Medium plastic", 30), v("Wooden small", 45)],
  },
  { id: "trash", name: "Trash bag", category: "cleaning", perTrami: 0.2, optionName: "Size", variants: [v("Normal", 8), v("Large", 12)] },

  /* Extras */
  {
    id: "potli",
    name: "Potli",
    category: "extras",
    perTrami: 1,
    occasions: ["nikkah"],
    optionName: "Type",
    variants: [v("Normal", 10), v("Special", 15), v("Nikkah", 20)],
  },
  {
    id: "mehndi",
    name: "Mehndi cone",
    category: "extras",
    perTrami: 2,
    occasions: ["mehndi"],
    optionName: "Type",
    variants: [v("Cone", 15), v("Highlighter", 25)],
  },
  {
    id: "cakeplate",
    name: "Cake plate",
    category: "extras",
    perTrami: 1,
    occasions: ["mehndi", "walima"],
    optionName: "Type",
    variants: [v("Paper", 2), v("Bio", 3)],
  },
  {
    id: "cakespoon",
    name: "Cake spoon",
    category: "extras",
    perTrami: 1,
    occasions: ["mehndi", "walima"],
    optionName: "Type",
    variants: [v("Small plastic", 0.6), v("Wooden small", 1.2)],
  },
];

/** Which variant each tier starts from: an index, or "last". */
export const tierDefaults: Record<Tier, { index: number | "last" }> = {
  basic: { index: 0 },
  standard: { index: 1 },
  premium: { index: "last" },
};

/** Variant names a preference switches to, checked in order. */
export const prefVariantNames = {
  bio: ["Bio"],
  printed: ["Printed", "Customized"],
} as const;

/** Extra stock preference multiplies every base quantity by this. */
export const EXTRA_STOCK_FACTOR = 1.1;

/** Budgets are the default kit total rounded up to this step. */
export const BUDGET_ROUNDING: Paise = rs(500);

export const TRAMI = { min: 1, max: 1000, step: 5, default: 50, quickPicks: [25, 50, 100, 200] } as const;

/** Bulk cap per cart line for kit products (normal products stay at 20). */
export const KIT_MAX_PER_ORDER = 10000;
