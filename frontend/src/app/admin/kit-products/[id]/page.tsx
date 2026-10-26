import { Suspense } from "react";
import { KitProductEditorPage } from "@/components/admin/kit-products-admin";
import { Skeleton } from "@/components/ui/primitives";

export const metadata = { title: "Edit kit product" };

/** Kit products come from the admin data loaded by the layout, so any id is resolved on the client. */
export async function generateStaticParams() {
  return [{ id: "kit_dastarkhan" }];
}

export default function Page({ params }: PageProps<"/admin/kit-products/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: PageProps<"/admin/kit-products/[id]">["params"] }) {
  const { id } = await params;
  return <KitProductEditorPage productId={id} />;
}
