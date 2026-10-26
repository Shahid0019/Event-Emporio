import { Suspense } from "react";
import { OrdersAdmin } from "@/components/admin/orders-admin";
import { Skeleton } from "@/components/ui/primitives";

export const metadata = { title: "Orders" };

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
      <OrdersAdmin />
    </Suspense>
  );
}
