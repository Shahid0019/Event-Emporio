import { getAccount } from "@/lib/server/accounts";
import { currentAccountId } from "@/lib/server/customer-session";
import { fail, ok, publicUser } from "@/lib/server/http";

/** The signed-in customer, so the browser can check its remembered name is still valid. */
export async function GET() {
  const id = await currentAccountId();
  const account = id ? await getAccount(id) : null;
  if (!account) return fail(401, "Not signed in");
  return ok({ user: publicUser(account) });
}
