import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderConfirmation } from "@/components/checkout/order-confirmation";
import { Skeleton } from "@/components/ui/primitives";

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
  const raw = await searchParams;
  const number = (Array.isArray(raw.order) ? raw.order[0] : raw.order)?.slice(0, 30) ?? "";
  return <OrderConfirmation number={number} />;
}
