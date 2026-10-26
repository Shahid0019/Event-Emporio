import { endSession } from "@/lib/server/customer-session";
import { ok } from "@/lib/server/http";

export async function POST() {
  await endSession();
  return ok({ ok: true });
}
