import type { NextRequest } from "next/server";
import { normalisePhone, removeLoginPhone, setLoginPhone } from "@/lib/server/accounts";
import { currentAccountId } from "@/lib/server/customer-session";
import { fail, ok, publicUser, readBody } from "@/lib/server/http";
import { checkPhoneCode } from "@/lib/server/phone-code";
import { rateLimit } from "@/lib/server/rate-limit";
import { phoneCodeSchema } from "@/lib/validations";

/** Adds a verified mobile number as a way to sign in to the current account. */
export async function POST(request: NextRequest) {
  const id = await currentAccountId();
  if (!id) return fail(401, "Please sign in again.");
  const body = await readBody(request, phoneCodeSchema);
  if ("error" in body) return fail(422, body.error);
  const phone = normalisePhone(body.data.phone);
  if (!rateLimit(`code:${phone}`, 10, 15 * 60_000).ok) return fail(429, "Too many tries. Ask for a new code in a few minutes.");
  if (!(await checkPhoneCode(phone, body.data.code))) return fail(401, "That code isn't right or has expired.");
  const result = await setLoginPhone(id, phone);
  if (!result.ok) return fail(409, result.error);
  return ok({ user: publicUser(result.account) });
}

/** Stops signing in with the mobile number (needs another way to sign in). */
export async function DELETE() {
  const id = await currentAccountId();
  if (!id) return fail(401, "Please sign in again.");
  const result = await removeLoginPhone(id);
  if (!result.ok) return fail(409, result.error);
  return ok({ user: publicUser(result.account) });
}
