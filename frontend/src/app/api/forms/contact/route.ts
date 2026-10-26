import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db/client";
import { fail, ok, readBody } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import type { Enquiry } from "@/lib/types";
import { newId } from "@/lib/utils";
import { contactSchema } from "@/lib/validations";

const subjects: Record<string, string> = {
  order: "Existing order",
  product: "Product question",
  custom: "Custom order",
  other: "Something else",
};

/** Contact form → the admin's Contact enquiries inbox. */
export async function POST(request: NextRequest) {
  if (!rateLimit(`contact:${clientKey(request)}`, 5, 15 * 60_000).ok)
    return fail(429, "Too many messages — please try again a little later.");
  const body = await readBody(request, contactSchema);
  if ("error" in body) return fail(422, body.error);
  const id = newId("enq");
  const enquiry: Enquiry = {
    id,
    name: body.data.name,
    email: body.data.email,
    ...(body.data.phone && { phone: body.data.phone }),
    subject: subjects[body.data.subject] ?? "Something else",
    message: body.data.message,
    receivedAt: new Date().toISOString(),
    status: "new",
  };
  await (await getDb()).collection<Enquiry & { _id: string }>("enquiries").insertOne({ _id: id, ...enquiry });
  return ok({ ok: true });
}
