import { randomBytes } from "node:crypto";
import { z } from "zod";
import { getDb, nextSequence, plain, plainAll } from "../db/client";
import { buildQuote, quoteRequestSchema } from "../quote";
import { SHIPPING_METHODS } from "../settings";
import type { Order, OrderKind, OrderLine, Product } from "../types";
import { checkoutSchema } from "../validations";
import { sendEmail } from "./email";
import { formatPrice } from "../utils";

/**
 * Orders (server only). An order is created as "pending" with the server's
 * own prices and totals, then confirmed only by a verified payment —
 * which is when stock is taken and the shop sees it as a new order.
 */

const bundleSchema = z.object({
  id: z.string().max(40),
  name: z.string().trim().max(80),
  summary: z.string().trim().max(160),
});

export const orderRequestSchema = checkoutSchema.extend({
  lines: z
    .array(
      quoteRequestSchema.shape.lines.element.extend({
        giftMessage: z.string().trim().max(200).optional(),
        bundle: bundleSchema.optional(),
      }),
    )
    .min(1)
    .max(200),
  couponCode: z.string().trim().max(30).optional(),
});

export type OrderRequest = z.input<typeof orderRequestSchema>;

/** Stored order: the public Order plus fields only the server uses. */
export interface OrderDoc extends Order {
  _id: string;
  accessToken: string;
  razorpayOrderId?: string;
  stockApplied?: boolean;
}

export const orderKinds = (lines: OrderLine[]): OrderKind[] => {
  const kinds = new Set<OrderKind>();
  for (const l of lines) kinds.add(l.bundle ? "built-kit" : "regular");
  return (["regular", "built-kit"] as const).filter((k) => kinds.has(k));
};

export type CreateOrderResult =
  { ok: true; order: Order; accessToken: string } | { ok: false; error: string; issues?: { variantId: string; message: string }[] };

export async function createPendingOrder(input: z.infer<typeof orderRequestSchema>, customerId?: string): Promise<CreateOrderResult> {
  const quote = await buildQuote({
    lines: input.lines.map((l) => ({ ...l, inKit: Boolean(l.bundle) })),
    couponCode: input.couponCode,
    shippingMethod: input.shippingMethod,
  });
  if (!quote.lines.length) return { ok: false, error: "Nothing in your bag can be ordered right now.", issues: quote.issues };

  const db = await getDb();
  const products = plainAll<Product>(
    await db
      .collection("products")
      .find({ _id: { $in: quote.lines.map((l) => l.productId) as never[] } })
      .toArray(),
  );

  const lines: OrderLine[] = quote.lines.map((ql) => {
    const requested = input.lines[ql.index];
    const product = products.find((p) => p.id === ql.productId)!;
    const variant = product.variants.find((v) => v.id === ql.variantId);
    return {
      productId: ql.productId,
      variantId: ql.variantId,
      slug: product.slug,
      name: ql.name,
      variantLabel: ql.variantLabel,
      image: product.images[variant?.imageIndex ?? 0] ?? product.images[0],
      unitPrice: ql.unitPrice,
      quantity: ql.quantity,
      ...(requested.giftMessage && { giftMessage: requested.giftMessage }),
      ...(requested.bundle && { bundle: requested.bundle }),
    };
  });

  const now = new Date();
  const seq = await nextSequence("order");
  const number = `EE${String(now.getFullYear()).slice(2)}${String(seq).padStart(5, "0")}`;
  const id = number.toLowerCase();
  const method = SHIPPING_METHODS.find((m) => m.id === input.shippingMethod) ?? SHIPPING_METHODS[0];
  const accessToken = randomBytes(24).toString("base64url");

  const order: Order = {
    id,
    number,
    createdAt: now.toISOString(),
    customer: { name: input.shipping.fullName, email: input.email, phone: input.phone },
    shippingAddress: { ...input.shipping, phone: input.phone, line2: input.shipping.line2 || undefined },
    deliveryInstructions: input.deliveryInstructions || undefined,
    lines,
    totals: quote.totals,
    couponCode: quote.couponApplied,
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: input.paymentMethod,
    shippingMethod: method.label,
    history: [{ status: "pending", at: now.toISOString(), note: input.paymentMethod === "cod" ? "Cash on delivery" : "Awaiting payment" }],
    kinds: orderKinds(lines),
    ...(customerId && { customerId }),
  };
  await db.collection<OrderDoc>("orders").insertOne({ _id: id, ...order, accessToken });
  return { ok: true, order, accessToken };
}

export async function setRazorpayOrderId(orderId: string, razorpayOrderId: string) {
  await (await getDb()).collection<OrderDoc>("orders").updateOne({ _id: orderId }, { $set: { razorpayOrderId } });
}

export async function findOrderDoc(
  filter: Partial<Pick<OrderDoc, "_id" | "number" | "razorpayOrderId" | "paymentReference">>,
): Promise<OrderDoc | null> {
  return (await getDb()).collection<OrderDoc>("orders").findOne(filter);
}

const publicOrder = (doc: OrderDoc): Order => {
  const { accessToken, razorpayOrderId, stockApplied, ...order } = plain<OrderDoc>(doc)!;
  void accessToken;
  void razorpayOrderId;
  void stockApplied;
  return order;
};

/** For the confirmation page: needs the private token from the checkout that created it. */
export async function orderForToken(number: string, token: string): Promise<Order | null> {
  const doc = await findOrderDoc({ number });
  return doc && token && doc.accessToken === token ? publicOrder(doc) : null;
}

/** Track an order with its number and the email it was placed with. */
export async function orderForLookup(number: string, email: string): Promise<Order | null> {
  const doc = await findOrderDoc({ number: number.trim().toUpperCase() });
  return doc && doc.customer.email.toLowerCase() === email.trim().toLowerCase() && doc.status !== "pending" ? publicOrder(doc) : null;
}

export async function ordersForCustomer(customerId: string): Promise<Order[]> {
  const docs = await (
    await getDb()
  )
    .collection<OrderDoc>("orders")
    .find({ customerId, status: { $ne: "pending" } })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(publicOrder);
}

/**
 * Marks an order paid exactly once: status, payment reference, stock and
 * sales counts, coupon usage. Safe to call again (webhook + browser both
 * confirm the same payment).
 */
export async function markOrderPaid(orderId: string, paymentReference: string): Promise<Order | null> {
  const db = await getDb();
  const orders = db.collection<OrderDoc>("orders");
  const now = new Date().toISOString();
  const doc = await orders.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $ne: "paid" } },
    {
      $set: { paymentStatus: "paid", status: "confirmed", paymentReference },
      $push: { history: { status: "confirmed", at: now, note: "Payment received" } },
    },
    { returnDocument: "after" },
  );
  if (!doc) {
    const existing = await orders.findOne({ _id: orderId });
    return existing ? publicOrder(existing) : null;
  }
  await takeStock(doc);

  const order = publicOrder(doc);
  void sendEmail(
    order.customer.email,
    `Order ${order.number} confirmed — Events Emporio`,
    `Thank you, ${order.customer.name}!\n\nWe've received your payment of ${formatPrice(order.totals.total)} for order ${order.number}.\nWe'll let you know when it ships.\n\nEvents Emporio`,
  );
  return order;
}

/**
 * Takes the order's stock and counts its coupon, exactly once. A line that
 * can't be fully covered is flagged for the team rather than failing the order.
 */
async function takeStock(doc: OrderDoc) {
  if (doc.stockApplied) return;
  const db = await getDb();
  const shortages: string[] = [];
  for (const line of doc.lines) {
    const res = await db
      .collection("products")
      .updateOne(
        { _id: line.productId as never, variants: { $elemMatch: { id: line.variantId, stock: { $gte: line.quantity } } } },
        { $inc: { "variants.$.stock": -line.quantity, salesCount: line.quantity } },
      );
    if (!res.modifiedCount) shortages.push(`${line.name} (${line.variantLabel}) × ${line.quantity}`);
  }
  await db.collection<OrderDoc>("orders").updateOne(
    { _id: doc._id },
    {
      $set: {
        stockApplied: true,
        ...(shortages.length && { staffNote: `Not enough stock when ordered — check: ${shortages.join(", ")}` }),
      },
    },
  );
  if (doc.couponCode) await db.collection("coupons").updateOne({ code: doc.couponCode }, { $inc: { usedCount: 1 } });
}

/**
 * Cash on delivery: the order is confirmed straight away (stock taken, the
 * shop starts packing) and stays "awaiting payment" until the cash is
 * collected — the admin records that when the order is delivered.
 */
export async function confirmCodOrder(orderId: string): Promise<Order | null> {
  const doc = await (
    await getDb()
  )
    .collection<OrderDoc>("orders")
    .findOneAndUpdate(
      { _id: orderId, paymentMethod: "cod", status: "pending" },
      {
        $set: { status: "confirmed" },
        $push: { history: { status: "confirmed", at: new Date().toISOString(), note: "Cash on delivery" } },
      },
      { returnDocument: "after" },
    );
  if (!doc) return null;
  await takeStock(doc);
  const order = publicOrder(doc);
  void sendEmail(
    order.customer.email,
    `Order ${order.number} confirmed — Events Emporio`,
    `Thank you, ${order.customer.name}!

We've received your order ${order.number}. Please keep ${formatPrice(order.totals.total)} ready in cash for when it's delivered.
We'll let you know when it ships.

Events Emporio`,
  );
  return order;
}

/** A full refund made outside the admin (e.g. from the Razorpay dashboard), reported by the webhook. */
export async function markOrderRefunded(orderId: string, note: string) {
  await (await getDb()).collection<OrderDoc>("orders").updateOne(
    { _id: orderId, paymentStatus: "paid" },
    {
      $set: { paymentStatus: "refunded", status: "refunded" },
      $push: { history: { status: "refunded", at: new Date().toISOString(), note } },
    },
  );
}

export async function markPaymentFailed(orderId: string, reason: string) {
  await (await getDb()).collection<OrderDoc>("orders").updateOne(
    { _id: orderId, paymentStatus: { $ne: "paid" } },
    {
      $set: { paymentStatus: "failed" },
      $push: { history: { status: "pending", at: new Date().toISOString(), note: `Payment failed: ${reason}` } },
    },
  );
}
