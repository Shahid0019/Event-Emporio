import type { NextRequest } from "next/server";
import { z } from "zod";
import { resetPassword } from "@/lib/server/accounts";
import { fail, ok, readBody } from "@/lib/server/http";
import { resetPasswordSchema } from "@/lib/validations";

const schema = z.intersection(resetPasswordSchema, z.object({ token: z.string().min(10).max(200) }));

export async function POST(request: NextRequest) {
  const body = await readBody(request, schema);
  if ("error" in body) return fail(422, body.error);
  if (!(await resetPassword(body.data.token, body.data.password))) {
    return fail(400, "This reset link has expired or was already used. Ask for a new one.");
  }
  return ok({ ok: true });
}
