import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { findOrderDoc, markPaymentFailed } from "@/lib/server/orders";

const schema = z.object({
  orderId: z.string().max(40),
  token: z.string().max(80),
  reason: z.string().max(200).default("Payment not completed"),
});

/** Records a failed or abandoned payment so the shop can see it. The bag stays as it was. */
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const doc = await findOrderDoc({ _id: parsed.data.orderId });
  if (!doc || doc.accessToken !== parsed.data.token) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  await markPaymentFailed(doc.id, parsed.data.reason);
  return NextResponse.json({ ok: true });
}
