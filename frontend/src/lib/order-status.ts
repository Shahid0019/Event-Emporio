import type { Order, OrderStatus, PaymentStatus } from "./types";

/** Allowed fulfilment transitions. Anything not listed is rejected. */
const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

export function nextStatuses(current: OrderStatus): OrderStatus[] {
  return transitions[current];
}

export function canTransition(from: OrderStatus, to: OrderStatus, paymentStatus?: PaymentStatus): boolean {
  if (!transitions[from].includes(to)) return false;
  // A refund only makes sense once money has actually been captured.
  if (to === "refunded" && paymentStatus !== undefined && paymentStatus !== "paid") return false;
  return true;
}

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

/** A placed cash-on-delivery order whose cash hasn't been collected yet. */
export const cashDue = (o: Pick<Order, "paymentMethod" | "paymentStatus" | "status">) =>
  o.paymentMethod === "cod" && o.paymentStatus === "pending" && o.status !== "pending" && o.status !== "cancelled";

/** Payment status as people read it: an unpaid COD order is "Cash on delivery", not "Awaiting payment". */
export const paymentLabel = (o: Pick<Order, "paymentMethod" | "paymentStatus" | "status">) =>
  cashDue(o) ? "Cash on delivery" : paymentStatusLabel[o.paymentStatus];

/** The customer-facing progress steps, in order. */
export const fulfilmentSteps: OrderStatus[] = ["confirmed", "processing", "shipped", "delivered"];
