import { Suspense } from "react";
import { OrderAdminDetail } from "@/components/admin/orders-admin";
import { Skeleton } from "@/components/ui/primitives";

export const metadata = { title: "Order" };

/** Orders come from the database at request time; this placeholder only satisfies prerendering. */
export async function generateStaticParams() {
  return [{ id: "order" }];
}

export default function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  const { id } = await params;
  return <OrderAdminDetail id={id} />;
}
