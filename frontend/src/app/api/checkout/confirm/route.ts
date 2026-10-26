import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TAGS } from "@/lib/db/queries";
import { findOrderDoc, markOrderPaid } from "@/lib/server/orders";
import { verifyPaymentSignature } from "@/lib/server/razorpay";

const schema = z.object({
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

/** Called by the browser after Razorpay Checkout succeeds. Trusts nothing until the signature checks out. */
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment confirmation" }, { status: 400 });
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json(
      { error: "We couldn't verify this payment. If money was taken, contact us with your order number." },
      { status: 400 },
    );
  }
  const doc = await findOrderDoc({ razorpayOrderId: razorpay_order_id });
  if (!doc) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const order = await markOrderPaid(doc.id, razorpay_payment_id);
  revalidateTag(TAGS.catalog, "max"); // stock changed
  return NextResponse.json({ number: order?.number ?? doc.number }, { headers: { "Cache-Control": "no-store" } });
}
