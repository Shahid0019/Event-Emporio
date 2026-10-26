import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TAGS } from "@/lib/db/queries";
import { findOrderDoc, markOrderPaid, markPaymentFailed } from "@/lib/server/orders";
import { razorpayConfigured } from "@/lib/server/razorpay";

const schema = z.object({ orderId: z.string().max(40), token: z.string().max(80), outcome: z.enum(["success", "failure"]) });

/**
 * LOCAL DEVELOPMENT ONLY — completes a payment without Razorpay so the whole
 * order flow can be tried before test keys are added. Disabled in
 * production and whenever Razorpay keys are configured.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production" || razorpayConfigured()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const doc = await findOrderDoc({ _id: parsed.data.orderId });
  if (!doc || doc.accessToken !== parsed.data.token) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (parsed.data.outcome === "failure") {
    await markPaymentFailed(doc.id, "Test payment declined");
    return NextResponse.json({ ok: false });
  }
  await markOrderPaid(doc.id, `test_${Date.now()}`);
  revalidateTag(TAGS.catalog, "max");
  return NextResponse.json({ ok: true, number: doc.number });
}
