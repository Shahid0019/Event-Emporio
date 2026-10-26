import type { NextRequest } from "next/server";
import { authenticate } from "@/lib/server/accounts";
import { startSession } from "@/lib/server/customer-session";
import { fail, ok, publicUser, readBody } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { loginSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const limit = rateLimit(`login:${clientKey(request)}`, 10, 15 * 60_000);
  if (!limit.ok) return fail(429, `Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`);
  const body = await readBody(request, loginSchema);
  if ("error" in body) return fail(422, body.error);
  const account = await authenticate(body.data.email, body.data.password);
  if (!account) return fail(401, "That email and password don't match.");
  await startSession(account.id);
  return ok({ user: publicUser(account) });
}
