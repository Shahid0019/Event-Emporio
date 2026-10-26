import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { loadSettings, TAGS } from "@/lib/db/queries";
import { currentAccountId } from "@/lib/server/customer-session";
import { confirmCodOrder, createPendingOrder, orderRequestSchema, setRazorpayOrderId } from "@/lib/server/orders";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId } from "@/lib/server/razorpay";

export interface CheckoutStart {
  orderId: string;
  number: string;
  token: string;
  amount: number;
  /**
   * "razorpay" = open Razorpay Checkout; "cod" = placed, pay on delivery;
   * "test" = local development without Razorpay keys.
   */
  mode: "razorpay" | "cod" | "test";
  razorpay?: { keyId: string; orderId: string };
  prefill: { name: string; email: string; contact: string };
}

/**
 * Creates an order priced on the server. Online payment gets a matching
 * Razorpay order; cash on delivery (when the shop has it turned on) is
 * confirmed straight away.
 */
export async function POST(request: NextRequest) {
  if (!rateLimit(`order:${clientKey(request)}`, 20, 10 * 60_000).ok) {
    return NextResponse.json({ error: "Too many attempts — please wait a few minutes and try again." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = orderRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your details and try again." }, { status: 422 });
  }

  const cod = parsed.data.paymentMethod === "cod";
  const testMode = !cod && !razorpayConfigured();
  if (testMode && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Online payment isn't set up yet. Please contact the shop to order." }, { status: 503 });
  }

  try {
    if (cod && !(await loadSettings()).payments.codEnabled) {
      return NextResponse.json({ error: "Cash on delivery isn't available right now. Please pay online." }, { status: 409 });
    }
    const result = await createPendingOrder(parsed.data, (await currentAccountId()) ?? undefined);
    if (!result.ok) return NextResponse.json({ error: result.error, issues: result.issues }, { status: 409 });
    const { order, accessToken } = result;
    const prefill = { name: order.customer.name, email: order.customer.email, contact: order.customer.phone };

    if (cod) {
      await confirmCodOrder(order.id);
      revalidateTag(TAGS.catalog, "max"); // stock changed
      const start: CheckoutStart = {
        orderId: order.id,
        number: order.number,
        token: accessToken,
        amount: order.totals.total,
        mode: "cod",
        prefill,
      };
      return NextResponse.json(start, { headers: { "Cache-Control": "no-store" } });
    }

    let razorpay: CheckoutStart["razorpay"];
    if (!testMode) {
      const rz = await createRazorpayOrder({ amount: order.totals.total, receipt: order.number, notes: { orderId: order.id } });
      await setRazorpayOrderId(order.id, rz.id);
      razorpay = { keyId: razorpayKeyId(), orderId: rz.id };
    }

    const start: CheckoutStart = {
      orderId: order.id,
      number: order.number,
      token: accessToken,
      amount: order.totals.total,
      mode: testMode ? "test" : "razorpay",
      razorpay,
      prefill,
    };
    return NextResponse.json(start, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("checkout order failed", err);
    return NextResponse.json({ error: "We couldn't start your payment. Please try again in a moment." }, { status: 502 });
  }
}
