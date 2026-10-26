import type { NextRequest } from "next/server";
import { changePassword } from "@/lib/server/accounts";
import { currentAccountId } from "@/lib/server/customer-session";
import { fail, ok, readBody } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { changePasswordSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const id = await currentAccountId();
  if (!id) return fail(401, "Please sign in again.");
  if (!rateLimit(`pw:${clientKey(request)}`, 10, 15 * 60_000).ok) return fail(429, "Too many attempts — try again in a few minutes.");
  const body = await readBody(request, changePasswordSchema);
  if ("error" in body) return fail(422, body.error);
  if (!(await changePassword(id, body.data.currentPassword, body.data.password))) return fail(400, "Your current password isn't right.");
  return ok({ ok: true });
}
