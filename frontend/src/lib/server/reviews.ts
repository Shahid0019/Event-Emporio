import type { z } from "zod";
import { getDb, plain } from "../db/client";
import type { Product, ProductReview } from "../types";
import { newId } from "../utils";
import type { reviewSchema } from "../validations";
import { getAccount } from "./accounts";

/**
 * Product reviews (server only). Only signed-in customers can write one, one
 * per product; it goes live once the shop approves it in Admin → Product
 * reviews. Editing a review sends it back for approval.
 */

async function reviews() {
  return (await getDb()).collection<ProductReview & { _id: string }>("productReviews");
}

/** "Aisha Khan" → "Aisha K." — enough to be personal without the full name. */
export function reviewerName(fullName: string): string {
  const [first = "Customer", ...rest] = fullName.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}

export async function reviewByCustomer(customerId: string, productId: string): Promise<ProductReview | null> {
  return plain<ProductReview>(await (await reviews()).findOne({ customerId, productId }));
}

export type SaveReviewResult = { ok: true; review: ProductReview } | { ok: false; status: number; error: string };

export async function saveReview(customerId: string, input: z.output<typeof reviewSchema>): Promise<SaveReviewResult> {
  const db = await getDb();
  const [account, product] = await Promise.all([
    getAccount(customerId),
    plain<Product>(await db.collection("products").findOne({ _id: input.productId as never, status: "active" })),
  ]);
  if (!account) return { ok: false, status: 401, error: "Please sign in again to post your review." };
  if (!product) return { ok: false, status: 404, error: "This product can't be reviewed." };

  // Bought it: a paid order on their account, or placed with their email as a guest.
  const bought = await db.collection("orders").findOne({
    paymentStatus: "paid",
    "lines.productId": product.id,
    $or: [{ customerId }, { "customer.email": account.email }],
  });

  const col = await reviews();
  const existing = await col.findOne({ customerId, productId: product.id });
  const now = new Date().toISOString();
  const review: ProductReview = {
    id: existing?.id ?? newId("rev"),
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    customerId,
    displayName: reviewerName(account.name),
    rating: input.rating,
    ...(input.title && { title: input.title }),
    text: input.text,
    verifiedPurchase: Boolean(bought),
    status: "pending",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await col.replaceOne({ _id: review.id }, review, { upsert: true });
  return { ok: true, review };
}
