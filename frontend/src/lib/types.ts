/**
 * Domain types shared by the storefront and admin.
 * All money values are integers in paise (₹1 = 100 paise) to avoid
 * floating-point rounding errors.
 */

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

export interface Collection {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image: ImageAsset;
  isFeatured: boolean;
  displayOrder: number;
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
  imageIndex?: number;
}

export interface ProductCustomization {
  giftMessage?: boolean;
  customPackaging?: boolean;
  /** Complex personalisation is quoted manually rather than priced automatically. */
  quoteOnRequest?: boolean;
}

export type ProductStatus = "active" | "draft" | "archived";

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  description: string[];
  categorySlug: string;
  collectionSlugs: string[];
  images: ImageAsset[];
  options: ProductOption[];
  variants: ProductVariant[];
  attributes: Record<string, string>;
  careInfo?: string;
  customization?: ProductCustomization;
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
  categorySlugs?: string[];
  isActive: boolean;
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
}

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
}
