"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { OrderDetail } from "@/components/account/order-detail";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { orderStore, sessionStore } from "@/lib/store";

export function OrderConfirmation({ number }: { number: string }) {
  const order = orderStore.useStore((orders) => orders.find((o) => o.number === number));
  const user = sessionStore.useStore();

  if (!order) {
    return (
      <EmptyState
        title="We couldn't find that order"
        description="If you've just placed an order, check your confirmation email or look it up with your order number."
        action={
          <Link href="/track-order" className={buttonVariants()}>
            Track an order
          </Link>
        }
      />
    );
  }

  return (
    <>
      <header className="mb-14 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/10 text-success">
          <Check className="size-7" />
        </span>
        <p className="eyebrow mt-8 text-accent-ink">Order {order.number}</p>
        <h1 className="mt-4 text-h1">
          Thank you, <em className="text-brand">{order.customer.name.split(" ")[0]}</em>
        </h1>
        <p className="mx-auto mt-5 max-w-lg leading-relaxed text-muted">
          Your order is confirmed. A confirmation will be sent to <span className="text-ink">{order.customer.email}</span> once email
          notifications are connected.
        </p>
      </header>

      <OrderDetail order={order} />

      <div className="mt-14 flex flex-wrap justify-center gap-4">
        <Link href="/shop" className={buttonVariants()}>
          Continue shopping
        </Link>
        {user ? (
          <Link href={`/account/orders/${order.id}`} className={buttonVariants({ variant: "outline" })}>
            View in my account
          </Link>
        ) : (
          <Link href="/register" className={buttonVariants({ variant: "outline" })}>
            Create an account
          </Link>
        )}
      </div>
    </>
  );
}
