import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  orderConfirmedEmail,
  orderStatusEmail,
  passwordResetEmail,
  refundEmail,
  trackOrderUrl,
  welcomeEmail,
} from "@/lib/server/email-templates";
import type { Order } from "@/lib/types";

const image = { src: "/images/demo/brass-tray.jpg", alt: "", width: 800, height: 800 };

const order: Order = {
  id: "ee2600042",
  number: "EE2600042",
  createdAt: "2026-11-20T06:15:00.000Z",
  customer: { name: "Asha <b>Mir</b>", email: "asha+test@example.com", phone: "9876543210" },
  shippingAddress: {
    fullName: "Asha Mir",
    line1: "12 Residency Road",
    city: "Srinagar",
    state: "Jammu & Kashmir",
    pincode: "190001",
    country: "IN",
    phone: "9876543210",
  },
  firstFunctionDate: "2026-12-14",
  deliveryInstructions: "Call before arriving",
  lines: [
    { productId: "p1", variantId: "v1", slug: "brass-tray", name: "Brass tray", variantLabel: "Large", image, unitPrice: 120000, quantity: 2 },
    {
      productId: "p2",
      variantId: "v2",
      slug: "trami",
      name: "Copper trami",
      variantLabel: "4-person",
      image,
      unitPrice: 450000,
      quantity: 3,
      bundle: { id: "kit1", name: "Baraat kit", summary: "150 guests · Classic" },
    },
  ],
  totals: { subtotal: 1590000, discount: 50000, shipping: 0, tax: 0, total: 1540000 },
  couponCode: "SHAADI5",
  status: "confirmed",
  paymentStatus: "paid",
  paymentMethod: "razorpay",
  shippingMethod: "Standard",
  history: [
    { status: "pending", at: "2026-11-20T06:15:00.000Z" },
    { status: "confirmed", at: "2026-11-20T06:16:00.000Z", note: "Payment received" },
  ],
  kinds: ["regular", "built-kit"],
  customerId: "cus_1",
};

const shipped: Order = {
  ...order,
  status: "shipped",
  history: [
    ...order.history,
    { status: "processing", at: "2026-11-21T04:00:00.000Z" },
    { status: "shipped", at: "2026-11-22T09:30:00.000Z" },
  ],
};
const tracking = { carrier: "Delhivery", number: "DL123456789IN", url: "https://www.delhivery.com/track/package/DL123456789IN" };

const all = {
  welcome: welcomeEmail({ name: "Zara Mir", email: "zara@example.com" }, "password"),
  confirmed: orderConfirmedEmail(order),
  "confirmed-cod": orderConfirmedEmail({ ...order, paymentMethod: "cod", paymentStatus: "pending" }),
  processing: orderStatusEmail({ ...shipped, status: "processing", history: shipped.history.slice(0, 3) }, "processing")!,
  shipped: orderStatusEmail(shipped, "shipped", tracking)!,
  "tracking-update": orderStatusEmail(shipped, "shipped", tracking, { trackingUpdate: true })!,
  delivered: orderStatusEmail({ ...shipped, status: "delivered", history: [...shipped.history, { status: "delivered", at: "2026-11-24T08:00:00.000Z" }] }, "delivered")!,
  cancelled: orderStatusEmail({ ...order, status: "cancelled" }, "cancelled")!,
  refund: refundEmail(order),
  reset: passwordResetEmail("Zara Mir", "https://example.com/reset-password?token=abc"),
};

describe("customer emails", () => {
  it("every email has a subject, HTML and a plain-text version", () => {
    for (const [name, m] of Object.entries(all)) {
      expect(m.subject, name).toBeTruthy();
      expect(m.html, name).toContain("<!doctype html>");
      expect(m.text.length, name).toBeGreaterThan(40);
    }
    // Writes the HTML to disk for a look in the browser: EMAIL_PREVIEW_DIR=... npx vitest run email-templates
    const dir = process.env.EMAIL_PREVIEW_DIR;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      for (const [name, m] of Object.entries(all)) writeFileSync(join(dir, `${name}.html`), m.html);
    }
  });

  it("order confirmation lists items, totals, address, the order time and a one-tap tracking link", () => {
    const m = all.confirmed;
    expect(m.subject).toBe("Order EE2600042 confirmed");
    expect(m.html).toContain("Brass tray");
    expect(m.html).toContain("Baraat kit");
    expect(m.html).toContain("SHAADI5");
    expect(m.html).toContain("Residency Road");
    expect(m.html).toContain("20 Nov 2026"); // placed time, India time
    expect(m.text).toContain("11:45 am");
    expect(m.html).toContain(trackOrderUrl(order).replace(/&/g, "&amp;"));
    expect(trackOrderUrl(order)).toMatch(/\/track-order\?order=EE2600042&email=asha%2Btest%40example\.com$/);
    expect(m.html).toContain("/account/orders/ee2600042");
    expect(all["confirmed-cod"].text).toContain("ready in cash");
  });

  it("escapes customer-entered text", () => {
    expect(all.confirmed.html).not.toContain("<b>Mir</b>");
    expect(all.confirmed.html).toContain("Asha");
  });

  it("shipping emails carry the courier, tracking number and progress dates", () => {
    expect(all.shipped.subject).toBe("Order EE2600042 is on its way");
    expect(all.shipped.html).toContain("DL123456789IN");
    expect(all.shipped.html).toContain("Track with Delhivery");
    expect(all.shipped.text).toContain("[x] Shipped — 22 Nov 2026");
    expect(all.shipped.text).toContain("[ ] Delivered");
    expect(all["tracking-update"].subject).toBe("Tracking details for order EE2600042");
    expect(all.delivered.text).toContain("[x] Delivered");
  });

  it("has no email for steps the customer doesn't need to hear about", () => {
    expect(orderStatusEmail(order, "pending")).toBeNull();
    expect(orderStatusEmail(order, "confirmed")).toBeNull();
  });
});
