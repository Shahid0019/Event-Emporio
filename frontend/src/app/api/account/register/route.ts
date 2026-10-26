import type { NextRequest } from "next/server";
import { registerAccount } from "@/lib/server/accounts";
import { startSession } from "@/lib/server/customer-session";
import { fail, ok, publicUser, readBody } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { registerSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  if (!rateLimit(`register:${clientKey(request)}`, 10, 60 * 60_000).ok) return fail(429, "Too many sign-ups from here  try again later.");
  const body = await readBody(request, registerSchema);
  if ("error" in body) return fail(422, body.error);
  const result = await registerAccount(body.data);
  if (!result.ok) return fail(409, result.error);
  await startSession(result.account.id);
  return ok({ user: publicUser(result.account) });
}
