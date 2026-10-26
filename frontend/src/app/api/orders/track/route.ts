import type { NextRequest } from "next/server";
import { fail, ok, readBody } from "@/lib/server/http";
import { orderForLookup } from "@/lib/server/orders";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { trackOrderSchema } from "@/lib/validations";

/** Track an order with its number and the email used to place it. */
export async function POST(request: NextRequest) {
  if (!rateLimit(`track:${clientKey(request)}`, 20, 15 * 60_000).ok)
    return fail(429, "Too many lookups — please try again in a few minutes.");
  const body = await readBody(request, trackOrderSchema);
  if ("error" in body) return fail(422, body.error);
  const order = await orderForLookup(body.data.orderNumber, body.data.email);
  if (!order) return fail(404, "We couldn't find an order with that number and email. Check both and try again.");
  return ok({ order });
}
