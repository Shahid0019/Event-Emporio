import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import { Skeleton } from "@/components/ui/primitives";
import { orderForToken } from "@/lib/server/orders";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <div className="container-luxe max-w-5xl pb-28 pt-12 sm:pt-16">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ConfirmationContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ConfirmationContent({ searchParams }: { searchParams: PageProps<"/checkout/success">["searchParams"] }) {
  await connection(); // always the live order
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 80) ?? "";
  const order = await orderForToken(first(raw.order), first(raw.t));
  return <OrderConfirmation order={order} />;
}
