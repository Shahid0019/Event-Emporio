import type { AdminKit } from "./kit/admin-kits";
import type { KitFunction } from "./kit/config";
import type { StoreSettings } from "./settings";
import type { Category, Coupon, CustomRequest, Enquiry, Order, Product, ProductReview, Review } from "./types";

/**
 * Everything the admin works with, loaded from the database by the admin
 * layout. Screens edit a copy; `diffAdminData` works out exactly what
 * changed so only that is sent to the server to be validated and saved.
 */

export interface StockMovement {
  id: string;
  at: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  delta: number;
  reason: string;
}

/** A customer as the admin sees them: accounts plus anyone who ordered as a guest. */
export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  hasAccount: boolean;
  joinedAt: string;
  orders: number;
  spent: number;
  lastOrderAt?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  summary: string;
}

export interface AdminData {
  products: Product[];
  categories: Category[];
  orders: Order[];
  coupons: Coupon[];
  /** Functions offered in the kit builder (wazwan, nikkah…), set by the shop. */
  kitFunctions: KitFunction[];
  customerKits: AdminKit[];
  enquiries: Enquiry[];
  customRequests: CustomRequest[];
  /** Customers' product reviews, waiting for approval or already decided. */
  productReviews: ProductReview[];
  stockMovements: StockMovement[];
  testimonials: Review[];
  settings: StoreSettings;
  /** Read-only, worked out on the server. */
  customers: CustomerSummary[];
  auditLog: AuditEntry[];
  /** Signed-in admin's email. */
  adminEmail: string;
}

/** Lists saved document by document. Coupons are keyed by code. */
export const ADMIN_LISTS = [
  "products",
  "categories",
  "orders",
  "coupons",
  "kitFunctions",
  "customerKits",
  "enquiries",
  "customRequests",
  "productReviews",
  "stockMovements",
] as const;
export type AdminList = (typeof ADMIN_LISTS)[number];

/** Pieces saved as a whole. */
export const ADMIN_SINGLES = ["testimonials", "settings"] as const;
export type AdminSingle = (typeof ADMIN_SINGLES)[number];

export interface AdminChanges {
  upserts: Partial<Record<AdminList, unknown[]>>;
  deletes: Partial<Record<AdminList, string[]>>;
  singles: Partial<{ [K in AdminSingle]: AdminData[K] }>;
  /**
   * Stock each changed product had when this screen loaded (product, variant, stock).
   * The server applies only the difference, so sales made meanwhile aren't overwritten.
   */
  stockBase?: Record<string, Record<string, number>>;
}

export const keyOf = (list: AdminList, doc: unknown): string => {
  const d = doc as { id?: string; code?: string };
  return String(list === "coupons" ? d.code : d.id);
};

export function diffAdminData(before: AdminData, after: AdminData): AdminChanges {
  const changes: AdminChanges = { upserts: {}, deletes: {}, singles: {} };
  for (const list of ADMIN_LISTS) {
    const prev = new Map(before[list].map((d) => [keyOf(list, d), JSON.stringify(d)]));
    const next = new Map(after[list].map((d) => [keyOf(list, d), d]));
    const upserts = [...next].filter(([key, doc]) => prev.get(key) !== JSON.stringify(doc)).map(([, doc]) => doc);
    const deletes = [...prev.keys()].filter((key) => !next.has(key));
    if (upserts.length) changes.upserts[list] = upserts;
    if (list === "products") {
      for (const p of upserts as AdminData["products"]) {
        const prior = before.products.find((x) => x.id === p.id);
        if (prior) (changes.stockBase ??= {})[p.id] = Object.fromEntries(prior.variants.map((v) => [v.id, v.stock]));
      }
    }
    if (deletes.length) changes.deletes[list] = deletes;
  }
  for (const single of ADMIN_SINGLES) {
    if (JSON.stringify(before[single]) !== JSON.stringify(after[single])) {
      (changes.singles as Record<string, unknown>)[single] = after[single];
    }
  }
  return changes;
}

export const hasChanges = (c: AdminChanges) =>
  Object.keys(c.upserts).length > 0 || Object.keys(c.deletes).length > 0 || Object.keys(c.singles).length > 0;
