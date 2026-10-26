import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { fail, ok, readBody } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import type { CustomRequest } from "@/lib/types";
import { newId } from "@/lib/utils";
import { customOrderSchema } from "@/lib/validations";

/** Custom order request → the admin's Custom orders inbox. */
export async function POST(request: NextRequest) {
  if (!rateLimit(`custom:${clientKey(request)}`, 5, 15 * 60_000).ok)
    return fail(429, "Too many requests — please try again a little later.");
  const body = await readBody(request, customOrderSchema);
  if ("error" in body) return fail(422, body.error);
  const id = newId("cr");
  const req: CustomRequest = {
    id,
    name: body.data.name,
    email: body.data.email,
    phone: body.data.phone,
    occasion: body.data.occasion,
    ...(body.data.eventDate && { eventDate: body.data.eventDate }),
    quantity: body.data.quantity,
    budget: body.data.budget,
    details: body.data.details,
    receivedAt: new Date().toISOString(),
    status: "new",
  };
  await (await getDb()).collection<CustomRequest & { _id: string }>("customRequests").insertOne({ _id: id, ...req });
  return ok({ ok: true });
}
