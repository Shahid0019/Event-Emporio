import { Suspense } from "react";
import { OrderAdminDetail } from "@/components/admin/orders-admin";
import { Skeleton } from "@/components/ui/primitives";
import { adminOrders } from "@/lib/data/admin";

export const metadata = { title: "Order" };

export async function generateStaticParams() {
  return adminOrders.slice(0, 5).map((o) => ({ id: o.id }));
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
