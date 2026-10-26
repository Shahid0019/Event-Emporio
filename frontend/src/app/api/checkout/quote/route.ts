import { NextResponse, type NextRequest } from "next/server";
import { buildQuote, quoteRequestSchema } from "@/lib/quote";

/**
 * Server-side price/stock/coupon recalculation for the checkout.
 * When the backend lands, the Razorpay order is created from this same
 * quote — never from amounts sent by the browser.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout request" }, { status: 422 });
  }
  try {
    return NextResponse.json(await buildQuote(parsed.data), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("quote failed", err);
    return NextResponse.json({ error: "We couldn't price your bag right now. Please try again." }, { status: 503 });
  }
}
