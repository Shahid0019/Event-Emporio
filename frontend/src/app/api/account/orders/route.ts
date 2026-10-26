import { currentAccountId } from "@/lib/server/customer-session";
import { fail, ok } from "@/lib/server/http";
import { ordersForCustomer } from "@/lib/server/orders";

/** Orders placed while signed in to this account (newest first). */
export async function GET() {
  const id = await currentAccountId();
  if (!id) return fail(401, "Please sign in again.");
  return ok({ orders: await ordersForCustomer(id) });
}
