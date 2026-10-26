/**
 * Domain types shared by the storefront and admin.
 * All money values are integers in paise (₹1 = 100 paise) to avoid
 * floating-point rounding errors.
 */

import type { KitCategory, Occasion } from "./kit/config";

export type Paise = number;

export interface ImageAsset {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: ImageAsset;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  /** e.g. { Size: "Large", Colour: "Ivory" } — empty for single-variant products */
  options: Record<string, string>;
  price: Paise;
  compareAtPrice?: Paise;
  stock: number;
  /** The image shown when this variant is picked (index into `images`). */
  imageIndex?: number;
  /** All of this variant's own photos, in order (the first equals `imageIndex`). */
  imageIndexes?: number[];
}

export interface ProductCustomization {
  giftMessage?: boolean;
  customPackaging?: boolean;
  /** Complex personalisation is quoted manually rather than priced automatically. */
  quoteOnRequest?: boolean;
}

export type ProductStatus = "active" | "draft" | "archived";

/** Present on products sold through the kit builder ("kit products"). */
export interface ProductKitInfo {
  /** Short id used by the kit engine and kit links, e.g. "spoon". */
  itemId: string;
  /** Section of the kit: Serving, Drinking, Take-home packing… */
  category: KitCategory;
  /** Units needed per trami (four guests). Fractions mean "1 per N trami". */
  perTrami: number;
  /** Only these occasions include it; omitted means every occasion. */
  occasions?: Occasion[];
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  description: string[];
  categorySlug: string;
  images: ImageAsset[];
  options: ProductOption[];
  variants: ProductVariant[];
  attributes: Record<string, string>;
  careInfo?: string;
  customization?: ProductCustomization;
  /** Set for kit products; plain catalogue products don't have it. */
  kit?: ProductKitInfo;
  /** Per-line order cap for bulk items (e.g. kit disposables). Defaults to MAX_LINE_QUANTITY. */
  maxPerOrder?: number;
  colour?: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  status: ProductStatus;
  /** Units sold — drives "Popularity" sort and bestsellers. */
  salesCount: number;
  createdAt: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface Review {
  id: string;
  productId?: string;
  displayName: string;
  rating?: number;
  text: string;
  productName?: string;
  /** Sample content created for development; must never be marked up as a real review. */
  isSample: boolean;
  isApproved: boolean;
}

/** "pending" until the shop approves it; "hidden" when the shop takes it down. */
export type ProductReviewStatus = "pending" | "approved" | "hidden";

/** A review a signed-in customer wrote on a product page — one per customer per product. */
export interface ProductReview {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  customerId: string;
  /** "Aisha K." — first name and initial, from the account. */
  displayName: string;
  rating: number;
  title?: string;
  text: string;
  /** The customer has a paid order with this product. */
  verifiedPurchase: boolean;
  status: ProductReviewStatus;
  createdAt: string;
  updatedAt: string;
}

/** A whole kit added from the kit builder; its items share this tag in the cart. */
export interface CartBundle {
  id: string;
  /** e.g. "Wazwan kit · 50 trami" */
  name: string;
  /** e.g. "Standard · Bio items" */
  summary: string;
  /** The kit itself (encoded, same format as shared kit links), so "Edit kit" reopens it exactly. */
  kit: string;
}

export interface CartLine {
  key: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  categorySlug: string;
  variantLabel: string;
  image: ImageAsset;
  unitPrice: Paise;
  compareAtPrice?: Paise;
  quantity: number;
  maxQuantity: number;
  /** Bulk cap copied from the product; absent means the normal per-line cap. */
  maxPerOrder?: number;
  giftMessage?: string;
  /** Set when this line is part of a kit; the cart shows the kit as one item. */
  bundle?: CartBundle;
}

export type CouponType = "percentage" | "fixed";

export interface Coupon {
  code: string;
  type: CouponType;
  /** Percentage (0-100) or fixed amount in paise */
  value: number;
  minSubtotal: Paise;
  maxDiscount?: Paise;
  startsAt: string;
  expiresAt: string;
  usageLimit?: number;
  usedCount: number;
  perCustomerLimit?: number;
  isActive: boolean;
  /** Public codes are listed in the bag for shoppers to tap; private ones (false) only work when typed. Unset counts as public. */
  showInBag?: boolean;
}

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface Address {
  id: string;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault?: boolean;
}

export interface OrderLine {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantLabel: string;
  image: ImageAsset;
  unitPrice: Paise;
  quantity: number;
  giftMessage?: string;
  /** Set when the line was part of a kit; the admin shows the kit as one group. */
  bundle?: { id: string; name: string; summary: string };
}

/** What an order contains — orders are filed under each kind they include. */
export type OrderKind = "regular" | "built-kit";

export interface OrderTotals {
  subtotal: Paise;
  discount: Paise;
  shipping: Paise;
  tax: Paise;
  total: Paise;
}

export interface OrderEvent {
  status: OrderStatus;
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  number: string;
  createdAt: string;
  customer: { name: string; email: string; phone: string };
  shippingAddress: Omit<Address, "id">;
  deliveryInstructions?: string;
  lines: OrderLine[];
  totals: OrderTotals;
  couponCode?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "razorpay" | "cod";
  paymentReference?: string;
  shippingMethod: string;
  tracking?: { carrier: string; number: string; url?: string };
  history: OrderEvent[];
  /** Regular products, built kits — an order can include both. */
  kinds: OrderKind[];
  /** Signed-in customer who placed it, if any. */
  customerId?: string;
  /** Private note for the shop team; never shown to the customer. */
  staffNote?: string;
}

/* ------------------------------- Inbox ------------------------------- */

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  receivedAt: string;
  status: "new" | "replied" | "closed";
}

export interface CustomRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  occasion: string;
  eventDate?: string;
  quantity: number;
  budget: string;
  details: string;
  receivedAt: string;
  status: "new" | "quoted" | "accepted" | "declined";
}
