import type { Document } from "mongodb";
import { z } from "zod";
import {
  ADMIN_LISTS,
  keyOf,
  type AdminChanges,
  type AdminData,
  type AdminList,
  type AuditEntry,
  type CustomerSummary,
} from "../admin-data";
import { getDb, plain, plainAll } from "../db/client";
import { TAGS } from "../db/queries";
import { CUSTOM_FUNCTION, FUNCTION_ID_MAX, FUNCTION_ID_PATTERN, FUNCTION_TITLE_MAX, type KitFunction } from "../kit/config";
import { defaultStoreSettings, type StoreSettings } from "../settings";
import type { Order, Product } from "../types";
import { canTransition } from "../order-status";
import { newId } from "../utils";
import { sendEmail } from "./email";
import type { OrderDoc } from "./orders";

/* --------------------------------- Load --------------------------------- */

export async function loadAdminData(adminEmail: string): Promise<AdminData> {
  const db = await getDb();
  const all = (name: string, sort: Record<string, 1 | -1> = {}) => db.collection(name).find({}).sort(sort).toArray();
  const [
    products,
    categories,
    orderDocs,
    coupons,
    kitFunctions,
    customerKits,
    enquiries,
    customRequests,
    productReviews,
    stockMovements,
    content,
    settingsDoc,
    accounts,
    audit,
  ] = await Promise.all([
    all("products", { createdAt: -1 }),
    all("categories", { displayOrder: 1 }),
    all("orders", { createdAt: -1 }),
    all("coupons", { code: 1 }),
    all("kitFunctions", { sortOrder: 1 }),
    all("customerKits", { updatedAt: -1 }),
    all("enquiries", { receivedAt: -1 }),
    all("customRequests", { receivedAt: -1 }),
    all("productReviews", { createdAt: -1 }),
    db.collection("stockMovements").find({}).sort({ at: -1 }).limit(500).toArray(),
    all("content"),
    db.collection<{ _id: string }>("settings").findOne({ _id: "store" }),
    db
      .collection("accounts")
      .find({}, { projection: { passwordHash: 0 } })
      .toArray(),
    db.collection("auditLog").find({}).sort({ at: -1 }).limit(100).toArray(),
  ]);

  // Private checkout fields never leave the server.
  const orders = plainAll<OrderDoc>(orderDocs).map(({ accessToken, razorpayOrderId, stockApplied, ...o }) => {
    void accessToken;
    void razorpayOrderId;
    void stockApplied;
    return o as Order;
  });
  const byId = Object.fromEntries(content.map((d) => [d._id as unknown as string, d as Document]));

  return {
    products: plainAll(products),
    categories: plainAll(categories),
    orders,
    coupons: plainAll(coupons),
    kitFunctions: plainAll<KitFunction>(kitFunctions),
    customerKits: plainAll(customerKits),
    enquiries: plainAll(enquiries),
    customRequests: plainAll(customRequests),
    productReviews: plainAll(productReviews),
    stockMovements: plainAll(stockMovements),
    testimonials: (byId.testimonials?.items as AdminData["testimonials"]) ?? [],
    settings: { ...defaultStoreSettings, ...plain<StoreSettings>(settingsDoc) },
    customers: summariseCustomers(plainAll(accounts), orders),
    auditLog: plainAll<AuditEntry>(audit),
    adminEmail,
  };
}

/** Accounts plus guests, with what they've spent on paid orders. */
function summariseCustomers(
  accounts: { id: string; name: string; email: string; phone?: string; createdAt: string }[],
  orders: Order[],
): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>();
  for (const a of accounts) {
    map.set(a.email, {
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone ?? "",
      hasAccount: true,
      joinedAt: a.createdAt,
      orders: 0,
      spent: 0,
    });
  }
  for (const o of orders) {
    if (o.paymentStatus !== "paid") continue;
    const email = o.customer.email.toLowerCase();
    const c =
      map.get(email) ??
      ({
        id: `guest:${email}`,
        name: o.customer.name,
        email,
        phone: o.customer.phone,
        hasAccount: false,
        joinedAt: o.createdAt,
        orders: 0,
        spent: 0,
      } as CustomerSummary);
    c.orders += 1;
    c.spent += o.totals.total;
    if (!c.phone) c.phone = o.customer.phone;
    if (!c.lastOrderAt || o.createdAt > c.lastOrderAt) c.lastOrderAt = o.createdAt;
    if (o.createdAt < c.joinedAt) c.joinedAt = o.createdAt;
    map.set(email, c);
  }
  return [...map.values()].sort((a, b) => (b.lastOrderAt ?? b.joinedAt).localeCompare(a.lastOrderAt ?? a.joinedAt));
}

/* ------------------------------- Validation ------------------------------ */

const text = (max: number) => z.string().max(max);
const id = z.string().min(1).max(64);
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
const money = z.number().int().min(0).max(1_000_000_000);
/** A function id: a short slug from Admin → Functions (or a shopper's own function). */
const functionId = z.string().max(FUNCTION_ID_MAX).regex(FUNCTION_ID_PATTERN);
const image = z.object({
  src: z.string().min(1).max(600),
  alt: text(200),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const product = z
  .object({
    id,
    slug,
    sku: z.string().min(1).max(60),
    name: z.string().trim().min(1).max(120),
    shortDescription: text(400),
    description: z.array(text(4000)).max(30),
    categorySlug: text(80),
    images: z.array(image).max(60),
    options: z.array(z.object({ name: text(40), values: z.array(text(60)).max(60) })).max(3),
    variants: z
      .array(
        z
          .object({
            id,
            sku: z.string().min(1).max(60),
            options: z.record(text(40), text(60)),
            price: money,
            compareAtPrice: money.optional(),
            stock: z.number().int().min(0).max(10_000_000),
            imageIndex: z.number().int().min(0).optional(),
            imageIndexes: z.array(z.number().int().min(0).max(59)).max(12).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    attributes: z.record(text(60), text(300)),
    kit: z
      .object({
        itemId: z.string().regex(/^[a-z0-9-]{1,20}$/),
        category: z.enum(["serving", "drinking", "packing", "cleaning", "extras"]),
        perTrami: z.number().positive().max(100),
        // Empty once its last function is deleted: the item is then only added by hand.
        occasions: z.array(functionId).max(100).optional(),
      })
      .optional(),
    maxPerOrder: z.number().int().positive().max(1_000_000).optional(),
    isFeatured: z.boolean(),
    isNewArrival: z.boolean(),
    status: z.enum(["active", "draft", "archived"]),
    salesCount: z.number().int().min(0),
    createdAt: text(40),
  })
  .passthrough();

const category = z
  .object({
    id,
    slug,
    name: z.string().trim().min(1).max(80),
    description: text(600),
    image,
    parentId: z.string().max(64).nullable(),
    displayOrder: z.number().int(),
    isActive: z.boolean(),
  })
  .passthrough();
const coupon = z
  .object({
    code: z.string().regex(/^[A-Z0-9_-]{2,30}$/),
    type: z.enum(["percentage", "fixed"]),
    value: z.number().min(0),
    minSubtotal: money,
    startsAt: text(40),
    expiresAt: text(40),
    usedCount: z.number().int().min(0),
    isActive: z.boolean(),
  })
  .passthrough();
const kitFunction = z
  .object({
    id: functionId.refine((v) => v !== CUSTOM_FUNCTION, `"${CUSTOM_FUNCTION}" is kept for customers' own functions`),
    name: z.string().trim().min(1).max(FUNCTION_TITLE_MAX),
    description: text(80),
    icon: z.string().max(20).optional(),
    image: image.optional(),
    isActive: z.boolean(),
    sortOrder: z.number().int(),
  })
  .strict();
const loose = z.object({ id }).passthrough();
/** The shop only approves, hides or deletes reviews; the wording stays the customer's. */
const productReview = z
  .object({
    id,
    productId: id,
    customerId: id,
    rating: z.number().int().min(1).max(5),
    text: text(1500),
    status: z.enum(["pending", "approved", "hidden"]),
  })
  .passthrough();

const listSchemas: Record<Exclude<AdminList, "orders">, z.ZodType> = {
  products: product,
  categories: category,
  coupons: coupon,
  kitFunctions: kitFunction,
  customerKits: loose,
  enquiries: loose,
  customRequests: loose,
  productReviews: productReview,
  stockMovements: loose,
};

/** The only order fields the shop team may change. Prices, items and totals are fixed once ordered. */
const orderUpdate = z.object({
  id,
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]),
  tracking: z.object({ carrier: text(60), number: text(80), url: text(300).nullish() }).nullish(),
  history: z.array(z.object({ status: z.string().max(20), at: text(40), note: text(300).nullish() })).max(100),
  staffNote: text(1000).nullish(),
});

const singleSchemas = {
  testimonials: z
    .array(
      z
        .object({
          id,
          displayName: z.string().trim().min(2).max(80),
          text: z.string().trim().min(10).max(1200),
          rating: z.number().int().min(1).max(5).optional(),
          productName: text(120).optional(),
          isApproved: z.boolean(),
          isSample: z.boolean(),
        })
        .passthrough(),
    )
    .max(200),
  settings: z.object({
    contact: z.object({ email: text(120), phone: text(30), whatsapp: z.string().regex(/^\d{0,15}$/), address: text(300) }),
    shipping: z.object({ standard: money, express: money, freeShippingThreshold: money.nullable() }),
    payments: z.object({ codEnabled: z.boolean() }),
    gstin: text(20),
  }),
} as const;

/* --------------------------------- Save --------------------------------- */

export type SaveResult = { ok: true; tags: string[] } | { ok: false; error: string };

const LIST_LABEL: Record<AdminList, string> = {
  products: "product",
  categories: "category",
  orders: "order",
  coupons: "coupon",
  kitFunctions: "function",
  customerKits: "customer kit",
  enquiries: "message",
  customRequests: "custom order request",
  productReviews: "product review",
  stockMovements: "stock adjustment",
};

const TAG_FOR: Partial<Record<string, string>> = {
  products: TAGS.catalog,
  categories: TAGS.catalog,
  kitFunctions: TAGS.kits,
  productReviews: TAGS.reviews,
  testimonials: TAGS.content,
  settings: TAGS.settings,
};

/**
 * Checkout takes stock and adds sales straight in the database. When the
 * admin saves a product, keep those: stock = live stock + the change made on
 * screen, and sales counts always come from the database.
 */
function mergeLiveStock(edited: Product, live: Product | null, base: Record<string, number> | undefined): Product {
  if (!live) return edited;
  return {
    ...edited,
    salesCount: live.salesCount,
    variants: edited.variants.map((v) => {
      const liveStock = live.variants.find((x) => x.id === v.id)?.stock;
      const before = base?.[v.id];
      if (liveStock === undefined || !Number.isInteger(before)) return v;
      return { ...v, stock: Math.max(0, liveStock + (v.stock - before!)) };
    }),
  };
}

export async function applyAdminChanges(changes: AdminChanges, adminEmail: string): Promise<SaveResult> {
  const db = await getDb();
  const tags = new Set<string>();
  const summary: string[] = [];

  // Validate everything before writing anything.
  const writes: (() => Promise<unknown>)[] = [];
  for (const list of ADMIN_LISTS) {
    const upserts = changes.upserts[list] ?? [];
    const deletes = changes.deletes[list] ?? [];
    if (!upserts.length && !deletes.length) continue;
    const col = db.collection<Document>(list);

    if (list === "orders") {
      for (const raw of upserts) {
        const parsed = orderUpdate.safeParse(raw);
        if (!parsed.success) return { ok: false, error: `Order update rejected: ${parsed.error.issues[0]?.message ?? "invalid data"}` };
        const { id: orderId, ...fields } = parsed.data;
        const before = (await col.findOne({ _id: orderId as never })) as unknown as Order | null;
        if (!before) return { ok: false, error: "That order no longer exists." };
        // Refunds go through refundOrder(); the only payment changes made here are an abandoned
        // checkout marked failed, and cash collected for a cash-on-delivery order.
        const cashCollected =
          before.paymentMethod === "cod" &&
          before.paymentStatus === "pending" &&
          fields.paymentStatus === "paid" &&
          before.status !== "cancelled";
        if (
          fields.paymentStatus !== before.paymentStatus &&
          !(fields.paymentStatus === "failed" && before.paymentStatus === "pending") &&
          !cashCollected
        ) {
          return { ok: false, error: "Payment status changes only through checkout or a refund." };
        }
        if (fields.status !== before.status && !canTransition(before.status, fields.status, before.paymentStatus)) {
          return {
            ok: false,
            error: `Order ${before.number} is ${before.status} and can't be moved to ${fields.status}. Refresh the page to see its latest state.`,
          };
        }
        writes.push(async () => {
          // A note or tracking cleared on screen is removed, not left behind.
          const { tracking, staffNote, ...rest } = fields;
          const unset = { ...(!tracking && { tracking: "" }), ...(!staffNote && { staffNote: "" }) };
          await col.updateOne(
            { _id: orderId as never },
            {
              $set: { ...rest, ...(tracking && { tracking }), ...(staffNote && { staffNote }) },
              ...(Object.keys(unset).length && { $unset: unset }),
            },
          );
          if (before.status !== fields.status) void notifyStatus(before, fields.status, fields.tracking ?? undefined);
        });
      }
      if (upserts.length) summary.push(`updated ${upserts.length} order${upserts.length > 1 ? "s" : ""}`);
      continue; // orders are never created or deleted from the admin
    }

    if (list === "stockMovements") {
      for (const raw of upserts) {
        const parsed = loose.safeParse(raw);
        if (!parsed.success) return { ok: false, error: "Stock adjustment rejected." };
        writes.push(() =>
          col.updateOne({ _id: parsed.data.id as never }, { $setOnInsert: { ...parsed.data, _id: parsed.data.id } }, { upsert: true }),
        );
      }
      continue; // the product's new stock is saved with the product
    }

    const schema = listSchemas[list];
    for (const raw of upserts) {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return {
          ok: false,
          error: `Couldn't save this ${LIST_LABEL[list]}: ${issue?.path.join(".") || "data"} — ${issue?.message ?? "invalid"}`,
        };
      }
      const doc = parsed.data as Document;
      const key = keyOf(list, doc);
      if (list === "products") {
        writes.push(async () => {
          const live = (await col.findOne({ _id: key as never })) as unknown as Product | null;
          const merged = mergeLiveStock(doc as Product, live, changes.stockBase?.[key]);
          await col.replaceOne({ _id: key as never }, { ...merged, _id: key }, { upsert: true });
        });
        continue;
      }
      writes.push(() => col.replaceOne({ _id: key as never }, { ...doc, _id: key }, { upsert: true }));
    }
    for (const key of deletes) writes.push(() => col.deleteOne({ _id: key as never }));
    if (upserts.length) summary.push(`saved ${upserts.length} ${LIST_LABEL[list]}${upserts.length > 1 ? "s" : ""}`);
    if (deletes.length) summary.push(`deleted ${deletes.length} ${LIST_LABEL[list]}${deletes.length > 1 ? "s" : ""}`);
    if (TAG_FOR[list]) tags.add(TAG_FOR[list]!);
  }

  for (const [single, value] of Object.entries(changes.singles) as [keyof typeof singleSchemas, unknown][]) {
    const schema = singleSchemas[single];
    if (!schema) continue;
    const parsed = schema.safeParse(value);
    if (!parsed.success) return { ok: false, error: `Couldn't save ${single}: ${parsed.error.issues[0]?.message ?? "invalid data"}` };
    if (single === "settings") {
      writes.push(() =>
        db
          .collection<Document>("settings")
          .replaceOne({ _id: "store" as never }, { _id: "store", ...(parsed.data as object) }, { upsert: true }),
      );
    } else {
      writes.push(() =>
        db.collection<Document>("content").replaceOne({ _id: single as never }, { _id: single, items: parsed.data }, { upsert: true }),
      );
    }
    summary.push(`updated ${single}`);
    if (TAG_FOR[single]) tags.add(TAG_FOR[single]!);
  }

  for (const write of writes) await write();
  if (summary.length) {
    const entry: AuditEntry = { id: newId("log"), at: new Date().toISOString(), by: adminEmail, summary: summary.join(", ") };
    await db.collection("auditLog").insertOne({ ...entry, _id: entry.id as never });
  }
  return { ok: true, tags: [...tags] };
}

/** Tells the customer when their order moves on (if email is set up). */
async function notifyStatus(order: Order, status: string, tracking?: { carrier: string; number: string }) {
  const messages: Record<string, string> = {
    shipped: `Good news — order ${order.number} is on its way.${
      tracking
        ? `
Courier: ${tracking.carrier}
Tracking number: ${tracking.number}`
        : ""
    }`,
    delivered: `Order ${order.number} has been delivered. We hope everything is perfect for your celebration!`,
    cancelled: `Order ${order.number} has been cancelled. If you paid, your refund will follow shortly.`,
  };
  if (!messages[status]) return;
  await sendEmail(
    order.customer.email,
    `Order ${order.number}: ${status}`,
    `Hi ${order.customer.name},

${messages[status]}

Events Emporio`,
  );
}
