import type { NextRequest } from "next/server";
import { normalisePhone } from "@/lib/server/accounts";
import { fail, ok, readBody } from "@/lib/server/http";
import { sendPhoneCode } from "@/lib/server/phone-code";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { phoneSchema } from "@/lib/validations";

/** Texts a 6-digit sign-in code. */
export async function POST(request: NextRequest) {
  const body = await readBody(request, phoneSchema);
  if ("error" in body) return fail(422, body.error);
  const phone = normalisePhone(body.data.phone);
  const perPhone = rateLimit(`sms:${phone}`, 5, 60 * 60_000);
  if (!rateLimit(`sms-ip:${clientKey(request)}`, 15, 60 * 60_000).ok || !perPhone.ok)
    return fail(429, `Too many codes requested. Try again in ${Math.max(1, Math.ceil(perPhone.retryAfterSeconds / 60))} minutes.`);
  const sent = await sendPhoneCode(phone);
  if (!sent.ok) return fail(502, sent.error);
  return ok({ sent: true, ...(sent.devCode && { devCode: sent.devCode }) });
}
