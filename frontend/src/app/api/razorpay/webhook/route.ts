import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { TAGS } from "@/lib/db/queries";
import { findOrderDoc, markOrderPaid, markOrderRefunded, markPaymentFailed } from "@/lib/server/orders";
import { verifyWebhookSignature } from "@/lib/server/razorpay";
import { formatPrice } from "@/lib/utils";

interface WebhookBody {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; error_description?: string } };
    refund?: { entity?: { id?: string; payment_id?: string; amount?: number } };
  };
}

/**
 * Razorpay webhook, verified with RAZORPAY_WEBHOOK_SECRET against the raw body.
 *   payment.captured / order.paid → the safety net when a customer closes the
 *     page before the browser confirms: Razorpay tells us directly.
 *   payment.failed → recorded so the shop can see the attempt.
 *   refund.processed → a full refund made from the Razorpay dashboard.
 * Every handler is safe to repeat; Razorpay retries until it gets a 2xx.
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  let body: WebhookBody;
  try {
    body = JSON.parse(raw) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.event === "refund.processed") {
    const refund = body.payload?.refund?.entity;
    if (!refund?.payment_id) return NextResponse.json({ ok: true });
    const doc = await findOrderDoc({ paymentReference: refund.payment_id });
    // Partial refunds are left to the team; only a full refund closes the order.
    if (doc && refund.amount !== undefined && refund.amount >= doc.totals.total) {
      await markOrderRefunded(doc.id, `Refunded ${formatPrice(refund.amount)} through Razorpay (${refund.id ?? "refund"})`);
    }
    return NextResponse.json({ ok: true });
  }

  const payment = body.payload?.payment?.entity;
  if (!payment?.order_id || !payment.id) return NextResponse.json({ ok: true });

  const doc = await findOrderDoc({ razorpayOrderId: payment.order_id });
  if (!doc) return NextResponse.json({ ok: true });

  if (body.event === "payment.captured" || body.event === "order.paid") {
    await markOrderPaid(doc.id, payment.id);
    revalidateTag(TAGS.catalog, "max");
  } else if (body.event === "payment.failed") {
    await markPaymentFailed(doc.id, payment.error_description ?? "Payment failed");
  }
  return NextResponse.json({ ok: true });
}
