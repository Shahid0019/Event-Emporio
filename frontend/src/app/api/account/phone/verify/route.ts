import type { NextRequest } from "next/server";
import { accountByLoginPhone, normalisePhone } from "@/lib/server/accounts";
import { startSession } from "@/lib/server/customer-session";
import { fail, ok, publicUser, readBody } from "@/lib/server/http";
import { checkPhoneCode, createPhoneTicket } from "@/lib/server/phone-code";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { phoneCodeSchema } from "@/lib/validations";

/** Checks the code: signs in a known number, or hands back a ticket to finish a new account. */
export async function POST(request: NextRequest) {
  const body = await readBody(request, phoneCodeSchema);
  if ("error" in body) return fail(422, body.error);
  const phone = normalisePhone(body.data.phone);
  if (!rateLimit(`code-ip:${clientKey(request)}`, 30, 15 * 60_000).ok || !rateLimit(`code:${phone}`, 10, 15 * 60_000).ok)
    return fail(429, "Too many tries. Ask for a new code in a few minutes.");
  if (!(await checkPhoneCode(phone, body.data.code))) return fail(401, "That code isn't right or has expired.");
  const account = await accountByLoginPhone(phone);
  if (!account) return ok({ ticket: await createPhoneTicket(phone) });
  await startSession(account.id);
  return ok({ user: publicUser(account) });
}
