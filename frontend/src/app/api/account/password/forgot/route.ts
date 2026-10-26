import type { NextRequest } from "next/server";
import { createPasswordReset } from "@/lib/server/accounts";
import { sendEmail } from "@/lib/server/email";
import { fail, ok, readBody } from "@/lib/server/http";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { siteUrl } from "@/lib/site";
import { forgotPasswordSchema } from "@/lib/validations";

/** Always answers the same way, so it can't be used to find out which emails have accounts. */
export async function POST(request: NextRequest) {
  if (!rateLimit(`forgot:${clientKey(request)}`, 5, 15 * 60_000).ok) return fail(429, "Too many requests — try again in a few minutes.");
  const body = await readBody(request, forgotPasswordSchema);
  if ("error" in body) return fail(422, body.error);
  const reset = await createPasswordReset(body.data.email);
  if (reset) {
    const origin = request.nextUrl.origin || siteUrl;
    const link = `${origin}/reset-password?token=${encodeURIComponent(reset.token)}`;
    await sendEmail(
      reset.account.email,
      "Reset your Events Emporio password",
      `Hi ${reset.account.name},\n\nUse this link within the next hour to choose a new password:\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    );
  }
  return ok({ ok: true });
}
