import type { NextRequest } from "next/server";
import { updateProfile } from "@/lib/server/accounts";
import { currentAccountId } from "@/lib/server/customer-session";
import { fail, ok, publicUser, readBody } from "@/lib/server/http";
import { profileSchema } from "@/lib/validations";

export async function PUT(request: NextRequest) {
  const id = await currentAccountId();
  if (!id) return fail(401, "Please sign in again.");
  const body = await readBody(request, profileSchema);
  if ("error" in body) return fail(422, body.error);
  const result = await updateProfile(id, { ...body.data, phone: body.data.phone || undefined });
  if (!result.ok) return fail(409, result.error);
  return ok({ user: publicUser(result.account) });
}
