import { Suspense } from "react";
import { AccountOrder } from "@/components/account/account-views";
import { Skeleton } from "@/components/ui/primitives";

export const metadata = { title: "Order Details" };

/** Orders are private, so only a placeholder shell is prerendered; the real id resolves per request. */
export async function generateStaticParams() {
  return [{ id: "preview" }];
}

export default function OrderPage({ params }: PageProps<"/account/orders/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <OrderContent params={params} />
    </Suspense>
  );
}

async function OrderContent({ params }: { params: PageProps<"/account/orders/[id]">["params"] }) {
  const { id } = await params;
  return <AccountOrder id={id} />;
}
