import { connection } from "next/server";
import { Suspense } from "react";
import { ProductEditor } from "@/components/admin/product-editor";
import { Skeleton } from "@/components/ui/primitives";
import { products } from "@/lib/data/products";

export const metadata = { title: "Edit product" };

export async function generateStaticParams() {
  return products.slice(0, 1).map((p) => ({ id: p.id }));
}

export default function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
      <Editor params={params} />
    </Suspense>
  );
}

/** Rendered per request: the form's field arrays generate random keys, which can't be part of a prerendered shell. */
async function Editor({ params }: { params: PageProps<"/admin/products/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  return <ProductEditor productId={id} />;
}
