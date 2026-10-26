"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import type { AdminChanges } from "@/lib/admin-data";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth";
import { applyAdminChanges } from "@/lib/server/admin-data";
import { getDb } from "@/lib/db/client";
import { sendEmail } from "@/lib/server/email";
import { findOrderDoc } from "@/lib/server/orders";
import { razorpayConfigured, refundRazorpayPayment } from "@/lib/server/razorpay";
import { formatPrice } from "@/lib/utils";

export type SaveResponse = { ok: true } | { ok: false; error: string };

/**
 * Saves what an admin screen changed. Re-checks the admin session on every
 * call, validates every document, records who changed what, and refreshes
 * the storefront data the change affects.
 */
export async function saveAdminChanges(changes: AdminChanges): Promise<SaveResponse> {
  const adminEmail = await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!adminEmail) return { ok: false, error: "Your admin session has ended — please sign in again." };
  try {
    const result = await applyAdminChanges(changes, adminEmail);
    if (!result.ok) return result;
    for (const tag of result.tags) updateTag(tag);
    return { ok: true };
  } catch (err) {
    console.error("admin save failed", err);
    return { ok: false, error: "Couldn't save just now — check your connection and try again." };
  }
}

/**
 * Refunds a paid order. Razorpay payments are refunded through Razorpay;
 * anything else (test payments) is recorded so the team can pay back by hand.
 */
export async function refundOrder(orderId: string): Promise<SaveResponse & { manual?: boolean }> {
  const adminEmail = await verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!adminEmail) return { ok: false, error: "Your admin session has ended — please sign in again." };
  const order = await findOrderDoc({ _id: orderId });
  if (!order) return { ok: false, error: "Order not found." };
  if (order.paymentStatus !== "paid") return { ok: false, error: "Only paid orders can be refunded." };

  const viaRazorpay = razorpayConfigured() && order.paymentReference?.startsWith("pay_");
  let note = "Refund recorded — pay the customer back manually";
  try {
    if (viaRazorpay) {
      const refund = await refundRazorpayPayment(order.paymentReference!, order.totals.total);
      note = `Refunded ${formatPrice(order.totals.total)} through Razorpay (${refund.id})`;
    }
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Razorpay didn't accept the refund. Check the payment in your Razorpay dashboard." };
  }

  const db = await getDb();
  await db.collection("orders").updateOne(
    { _id: orderId as never },
    {
      $set: { status: "refunded", paymentStatus: "refunded" },
      $push: { history: { status: "refunded", at: new Date().toISOString(), note } } as never,
    },
  );
  await db.collection("auditLog").insertOne({
    _id: `log_${Date.now()}` as never,
    id: `log_${Date.now()}`,
    at: new Date().toISOString(),
    by: adminEmail,
    summary: `refunded order ${order.number}`,
  });
  void sendEmail(
    order.customer.email,
    `Refund for order ${order.number}`,
    `Hi ${order.customer.name},

We've refunded ${formatPrice(order.totals.total)} for order ${order.number}. It can take 5–7 working days to reach your account.

Events Emporio`,
  );
  return { ok: true, manual: !viaRazorpay };
}
