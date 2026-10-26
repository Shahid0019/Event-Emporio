import type { NextRequest } from "next/server";
import { currentAccountId } from "@/lib/server/customer-session";
import { fail, ok, readBody } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { reviewByCustomer, saveReview } from "@/lib/server/reviews";
import { reviewSchema } from "@/lib/validations";

/** The signed-in customer's own review of a product (any status), so the page can show or edit it. */
export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get("productId")?.slice(0, 40);
  if (!productId) return fail(400, "Missing product");
  const customerId = await currentAccountId();
  if (!customerId) return fail(401, "Not signed in");
  return ok({ review: await reviewByCustomer(customerId, productId) });
}

/** Writes or updates the signed-in customer's review; it waits for the shop's approval. */
export async function POST(request: NextRequest) {
  const customerId = await currentAccountId();
  if (!customerId) return fail(401, "Please sign in to write a review.");
  if (!rateLimit(`review:${customerId}:${clientKey(request)}`, 10, 60 * 60_000).ok) {
    return fail(429, "You've posted a lot of reviews just now — please try again later.");
  }
  const body = await readBody(request, reviewSchema);
  if ("error" in body) return fail(422, body.error);
  const result = await saveReview(customerId, body.data);
  if (!result.ok) return fail(result.status, result.error);
  return ok({ review: result.review });
}
