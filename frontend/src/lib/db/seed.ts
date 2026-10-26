import type { Document } from "mongodb";
import { categories } from "../data/categories";
import { announcements, homepage } from "../data/content";
import { products } from "../data/products";
import { starterFunctions } from "../kit/config";
import { defaultStoreSettings } from "../settings";

/**
 * Starting content copied into an empty database on first connection:
 * the catalogue (everyday and kit products), categories, kit functions,
 * homepage content and default settings. The shop team edits
 * all of it in the admin afterwards.
 *
 * Deliberately NOT seeded: orders, customers, enquiries, coupons and
 * sample reviews — those only ever come from real activity.
 */
export function seedDocuments(): Record<string, Document[]> {
  const withId = <T extends { id: string }>(list: T[]) => list.map((doc) => ({ _id: doc.id, ...doc }));

  return {
    products: withId(products),
    categories: withId(categories),
    kitFunctions: withId(starterFunctions),
    content: [
      { _id: "announcements", items: announcements },
      { _id: "hero", ...homepage.hero },
      { _id: "testimonials", items: [] },
    ],
    settings: [{ _id: "store", ...defaultStoreSettings }],
  };
}
