import type { NextRequest } from "next/server";
import { registerPhoneAccount } from "@/lib/server/accounts";
import { startSession } from "@/lib/server/customer-session";
import { fail, ok, publicUser, readBody } from "@/lib/server/http";
import { readPhoneTicket } from "@/lib/server/phone-code";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { phoneProfileSchema } from "@/lib/validations";

/** Creates the account for a number verified moments ago (the ticket proves it). */
export async function POST(request: NextRequest) {
  if (!rateLimit(`register:${clientKey(request)}`, 10, 60 * 60_000).ok) return fail(429, "Too many sign-ups from here — try again later.");
  const body = await readBody(request, phoneProfileSchema);
  if ("error" in body) return fail(422, body.error);
  const phone = await readPhoneTicket(body.data.ticket);
  if (!phone) return fail(410, "That took a little long. Please verify your number again.");
  const result = await registerPhoneAccount({ name: body.data.name, email: body.data.email, phone });
  if (!result.ok) return fail(409, result.error);
  await startSession(result.account.id);
  return ok({ user: publicUser(result.account) });
}
