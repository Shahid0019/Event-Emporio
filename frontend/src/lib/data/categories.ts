import type { Category } from "../types";
import { demoImage } from "./images";

/**
 * DEMO DATA — proposed categories based on the Instagram bio
 * ("Mehndi Baskets | Bridal Hampers | Disposables"). The final category tree
 * is managed by the client through the admin dashboard.
 */
export const categories: Category[] = [
  {
    id: "cat_mehndi",
    slug: "mehndi-baskets",
    name: "Mehndi Baskets",
    description: "Hand-dressed baskets and trays for the mehndi night — cones, favours and keepsakes, beautifully presented.",
    image: demoImage("rose-basket", "Wicker basket filled with blush roses"),
    parentId: null,
    displayOrder: 1,
    isActive: true,
  },
  {
    id: "cat_bridal",
    slug: "bridal-hampers",
    name: "Bridal Hampers",
    description: "Curated hampers for the bride and her family, finished with ribbon, florals and a handwritten note.",
    image: demoImage("gift-candlelight", "Gift box tied with black ribbon beside lit candles"),
    parentId: null,
    displayOrder: 2,
    isActive: true,
  },
  {
    id: "cat_wedding",
    slug: "wedding-essentials",
    name: "Wedding Essentials",
    description: "The details that make the day — trays, platters, décor accents and ceremony pieces.",
    image: demoImage("brass-tray", "Ornate brass tray with sweets on marble"),
    parentId: null,
    displayOrder: 3,
    isActive: true,
  },
  {
    id: "cat_hampers",
    slug: "luxury-hampers",
    name: "Luxury Gift Hampers",
    description: "Chocolates, macarons and dry fruits, arranged for gifting that feels considered.",
    image: demoImage("macaron-box", "Pastel macarons in a white box tied with a pink ribbon"),
    parentId: null,
    displayOrder: 4,
    isActive: true,
  },
  {
    id: "cat_custom",
    slug: "customised-gifts",
    name: "Customised Gifts",
    description: "Personalised boxes and hampers made to your brief — names, colours and quantities of your choosing.",
    image: demoImage("gift-kraft", "Kraft paper gift wrapped with a black velvet bow"),
    parentId: null,
    displayOrder: 5,
    isActive: true,
  },
  {
    id: "cat_disposables",
    slug: "decorative-disposables",
    name: "Decorative Disposables",
    description: "Elegant single-use tableware and table décor, so hosting looks beautiful and clearing up stays simple.",
    image: demoImage("table-setting", "Dining table dressed with rust linen and ceramic plates"),
    parentId: null,
    displayOrder: 6,
    isActive: true,
  },
];

export function categoryBySlug(slug: string) {
  return categories.find((c) => c.slug === slug && c.isActive);
}
