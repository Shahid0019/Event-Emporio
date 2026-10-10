import type { Order, OrderStatus, PaymentStatus } from "../types";
import { variantLabel } from "../utils";
import { products } from "./products";

/**
 * DEMO ADMIN DATA — generated from a fixed seed so every render is
 * identical (no Math.random / Date.now at module scope). Customers,
 * orders and enquiries are fictional and exist only for development.
 */

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const rand = seeded(20261009);
const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)];

/** All demo timestamps are relative to this fixed "today". */
export const DEMO_TODAY = new Date("2026-10-09T12:00:00+05:30");

const firstNames = [
  "Aisha",
  "Rohan",
  "Sana",
  "Imran",
  "Mehak",
  "Arjun",
  "Zoya",
  "Faisal",
  "Nida",
  "Kabir",
  "Hiba",
  "Vikram",
  "Iqra",
  "Tariq",
  "Anaya",
  "Owais",
];
const lastNames = ["Bhat", "Kaul", "Mir", "Sharma", "Wani", "Dar", "Malik", "Raina", "Shah", "Lone", "Khan", "Gupta"];
const cities = [
  { city: "Srinagar", state: "Jammu and Kashmir", pin: "190001" },
  { city: "Jammu", state: "Jammu and Kashmir", pin: "180001" },
  { city: "Anantnag", state: "Jammu and Kashmir", pin: "192101" },
  { city: "Baramulla", state: "Jammu and Kashmir", pin: "193101" },
  { city: "New Delhi", state: "Delhi", pin: "110001" },
  { city: "Chandigarh", state: "Chandigarh", pin: "160017" },
];

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joinedAt: string;
  marketingOptIn: boolean;
}

export const customers: Customer[] = Array.from({ length: 24 }, (_, i) => {
  const name = `${firstNames[i % firstNames.length]} ${pick(lastNames)}`;
  const joined = new Date(DEMO_TODAY.getTime() - Math.floor(rand() * 240 + 5) * 86_400_000);
  return {
    id: `cus_${String(i + 1).padStart(3, "0")}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: `9${Math.floor(rand() * 9e8 + 1e8)}`,
    city: pick(cities).city,
    joinedAt: joined.toISOString(),
    marketingOptIn: rand() > 0.45,
  };
});

const active = products.filter((p) => p.status === "active");

function statusFor(ageDays: number): { status: OrderStatus; payment: PaymentStatus } {
  const r = rand();
  if (r < 0.05) return { status: "cancelled", payment: rand() > 0.5 ? "refunded" : "failed" };
  if (r < 0.08) return { status: "refunded", payment: "refunded" };
  if (ageDays < 1) return { status: r < 0.5 ? "pending" : "confirmed", payment: r < 0.5 ? "pending" : "paid" };
  if (ageDays < 3) return { status: "processing", payment: "paid" };
  if (ageDays < 6) return { status: "shipped", payment: "paid" };
  return { status: "delivered", payment: "paid" };
}

const flow: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

export const adminOrders: Order[] = Array.from({ length: 42 }, (_, i) => {
  const ageDays = Math.floor(rand() * 30);
  const created = new Date(DEMO_TODAY.getTime() - ageDays * 86_400_000 - Math.floor(rand() * 10) * 3_600_000);
  const customer = pick(customers);
  const place = pick(cities);
  const lineCount = 1 + Math.floor(rand() * 3);
  const lines = Array.from({ length: lineCount }, () => {
    const p = pick(active);
    const v = pick(p.variants);
    return {
      productId: p.id,
      variantId: v.id,
      slug: p.slug,
      name: p.name,
      variantLabel: variantLabel(v.options),
      image: p.images[0],
      unitPrice: v.price,
      quantity: 1 + Math.floor(rand() * 2),
    };
  }).filter((l, idx, arr) => arr.findIndex((x) => x.variantId === l.variantId) === idx);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const discount = rand() < 0.2 ? Math.min(Math.floor(subtotal * 0.1), 50000) : 0;
  const shipping = subtotal - discount >= 499900 ? 0 : 15000;
  const { status, payment } = statusFor(ageDays);
  const reached = flow.indexOf(status);
  const history =
    reached >= 0
      ? flow.slice(0, reached + 1).map((s, k) => ({ status: s, at: new Date(created.getTime() + k * 26 * 3_600_000).toISOString() }))
      : [
          { status: "pending" as const, at: created.toISOString() },
          { status, at: new Date(created.getTime() + 5 * 3_600_000).toISOString() },
        ];
  const number = `EE26${String(1040 + 42 - i).padStart(6, "0")}`;

  return {
    id: number.toLowerCase(),
    number,
    createdAt: created.toISOString(),
    customer: { name: customer.name, email: customer.email, phone: customer.phone },
    shippingAddress: {
      fullName: customer.name,
      phone: customer.phone,
      line1: `${Math.floor(rand() * 200) + 1}, ${pick(["Residency Road", "Boulevard Road", "Gogji Bagh", "Rajbagh", "Hyderpora", "Gandhi Nagar"])}`,
      city: place.city,
      state: place.state,
      pincode: place.pin,
      country: "India",
    },
    lines,
    totals: { subtotal, discount, shipping, tax: 0, total: subtotal - discount + shipping },
    couponCode: discount ? "WELCOME10" : undefined,
    status,
    paymentStatus: payment,
    paymentMethod: "razorpay",
    paymentReference:
      payment === "pending"
        ? undefined
        : `pay_DEMO${Math.floor(rand() * 1e10)
            .toString(36)
            .toUpperCase()}`,
    shippingMethod: "Standard delivery",
    tracking:
      status === "shipped" || status === "delivered" ? { carrier: "Demo Courier", number: `DC${Math.floor(rand() * 1e9)}` } : undefined,
    history,
  } satisfies Order;
}).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  receivedAt: string;
  status: "new" | "replied" | "closed";
}

export const enquiries: Enquiry[] = [
  {
    id: "enq_1",
    name: customers[2].name,
    email: customers[2].email,
    subject: "Product question",
    message: "Do the mehndi baskets come with henna cones, or only the basket?",
    receivedAt: "2026-10-08T15:20:00+05:30",
    status: "new",
  },
  {
    id: "enq_2",
    name: customers[5].name,
    email: customers[5].email,
    subject: "Existing order",
    message: "Could you confirm whether my order can be delivered before the 20th?",
    receivedAt: "2026-10-07T11:05:00+05:30",
    status: "replied",
  },
  {
    id: "enq_3",
    name: customers[9].name,
    email: customers[9].email,
    subject: "Something else",
    message: "Are you open for in-person visits at the studio?",
    receivedAt: "2026-10-04T18:40:00+05:30",
    status: "closed",
  },
  {
    id: "enq_4",
    name: customers[12].name,
    email: customers[12].email,
    subject: "Product question",
    message: "Is the Candlelight Gift Set available in other fragrances?",
    receivedAt: "2026-10-09T09:12:00+05:30",
    status: "new",
  },
];

export interface CustomRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  occasion: string;
  eventDate?: string;
  quantity: number;
  budget: string;
  details: string;
  receivedAt: string;
  status: "new" | "quoted" | "accepted" | "declined";
}

export const customRequests: CustomRequest[] = [
  {
    id: "cr_1",
    name: customers[1].name,
    email: customers[1].email,
    phone: customers[1].phone,
    occasion: "Wedding",
    eventDate: "2026-11-22",
    quantity: 120,
    budget: "₹1,000 – ₹2,500",
    details: "Favour pouches for the mehndi night in ivory and gold, with guest names on tags.",
    receivedAt: "2026-10-08T10:30:00+05:30",
    status: "new",
  },
  {
    id: "cr_2",
    name: customers[7].name,
    email: customers[7].email,
    phone: customers[7].phone,
    occasion: "Corporate gifting",
    eventDate: "2026-12-15",
    quantity: 60,
    budget: "₹2,500 – ₹5,000",
    details: "Year-end hampers for clients with our logo on the box sleeve.",
    receivedAt: "2026-10-05T16:10:00+05:30",
    status: "quoted",
  },
  {
    id: "cr_3",
    name: customers[14].name,
    email: customers[14].email,
    phone: customers[14].phone,
    occasion: "Engagement",
    eventDate: "2026-10-30",
    quantity: 2,
    budget: "Above ₹10,000",
    details: "Two matching trousseau boxes, burgundy lining, dry fruit platters for both families.",
    receivedAt: "2026-09-29T12:45:00+05:30",
    status: "accepted",
  },
];

export const subscribers = customers
  .filter((c) => c.marketingOptIn)
  .map((c) => ({ email: c.email, subscribedAt: c.joinedAt, source: rand() > 0.5 ? "Footer form" : "Checkout" }));

export type AdminRole = "owner" | "manager" | "fulfilment";

export const adminUsers: { id: string; name: string; email: string; role: AdminRole; lastActive: string }[] = [
  { id: "adm_1", name: "Store Owner (demo)", email: "owner@example.com", role: "owner", lastActive: "2026-10-09T11:40:00+05:30" },
  {
    id: "adm_2",
    name: "Operations Manager (demo)",
    email: "manager@example.com",
    role: "manager",
    lastActive: "2026-10-08T19:02:00+05:30",
  },
  { id: "adm_3", name: "Packing Team (demo)", email: "packing@example.com", role: "fulfilment", lastActive: "2026-10-09T09:15:00+05:30" },
];

export const rolePermissions: Record<AdminRole, string[]> = {
  owner: ["Everything, including settings, payments and admin users"],
  manager: ["Products, inventory, orders, coupons, content", "No payment settings or admin users"],
  fulfilment: ["View orders, update fulfilment status and tracking", "No pricing, products or customer exports"],
};

export const auditLog = [
  { at: "2026-10-09T11:38:00+05:30", actor: "Store Owner (demo)", action: "Updated price", target: "Gilded Rose Mehndi Basket / Medium" },
  { at: "2026-10-09T09:20:00+05:30", actor: "Packing Team (demo)", action: "Marked order shipped", target: adminOrders[4]?.number ?? "" },
  { at: "2026-10-08T18:55:00+05:30", actor: "Operations Manager (demo)", action: "Created coupon", target: "MEHNDI500" },
  { at: "2026-10-08T14:02:00+05:30", actor: "Store Owner (demo)", action: "Published product", target: "Blush Rose Bouquet Box" },
];
