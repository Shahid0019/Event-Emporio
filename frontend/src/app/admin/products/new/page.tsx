import { connection } from "next/server";
import { Suspense } from "react";
import { ProductEditor } from "@/components/admin/product-editor";
import { Skeleton } from "@/components/ui/primitives";

export const metadata = { title: "New product" };

export default function NewProductPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
      <Editor />
    </Suspense>
  );
}

/** Rendered per request: the form's field arrays generate random keys, which can't be part of a prerendered shell. */
async function Editor() {
  await connection();
  return <ProductEditor />;
}
