import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAccount, saveAddresses } from "@/lib/server/accounts";
import { currentAccountId } from "@/lib/server/customer-session";
import { fail, ok, readBody } from "@/lib/server/http";
import { newId } from "@/lib/utils";
import { addressSchema } from "@/lib/validations";

const storedAddress = addressSchema.extend({
  id: z.string().max(40),
  label: z.string().trim().max(40).optional(),
  isDefault: z.boolean().optional(),
});

async function account() {
  const id = await currentAccountId();
  return id ? getAccount(id) : null;
}

export async function GET() {
  const a = await account();
  if (!a) return fail(401, "Please sign in again.");
  return ok({ addresses: a.addresses });
}

/** Adds one address (e.g. "save this address" at checkout). Skips exact duplicates. */
export async function POST(request: NextRequest) {
  const a = await account();
  if (!a) return fail(401, "Please sign in again.");
  const body = await readBody(request, addressSchema);
  if ("error" in body) return fail(422, body.error);
  const same = (x: { line1: string; pincode: string; fullName: string }) =>
    x.line1.toLowerCase() === body.data.line1.toLowerCase() && x.pincode === body.data.pincode && x.fullName === body.data.fullName;
  if (!a.addresses.some(same)) {
    await saveAddresses(a.id, [
      ...a.addresses,
      { ...body.data, line2: body.data.line2 || undefined, id: newId("addr"), isDefault: a.addresses.length === 0 },
    ]);
  }
  return ok({ addresses: (await getAccount(a.id))?.addresses ?? [] });
}

/** Replaces the whole list (edit, delete, make default). */
export async function PUT(request: NextRequest) {
  const a = await account();
  if (!a) return fail(401, "Please sign in again.");
  const body = await readBody(request, z.object({ addresses: z.array(storedAddress).max(20) }));
  if ("error" in body) return fail(422, body.error);
  await saveAddresses(
    a.id,
    body.data.addresses.map((x) => ({ ...x, line2: x.line2 || undefined })),
  );
  return ok({ addresses: (await getAccount(a.id))?.addresses ?? [] });
}
