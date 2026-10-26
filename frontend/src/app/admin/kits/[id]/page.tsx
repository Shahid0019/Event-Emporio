import { Suspense } from "react";
import { KitEditorPage } from "@/components/admin/kits-admin";
import { Skeleton } from "@/components/ui/primitives";

export const metadata = { title: "Edit customer kit" };

/** Customer kits come from the database at request time; this placeholder only satisfies prerendering. */
export async function generateStaticParams() {
  return [{ id: "kit" }];
}

export default function Page({ params }: PageProps<"/admin/kits/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: PageProps<"/admin/kits/[id]">["params"] }) {
  const { id } = await params;
  return <KitEditorPage kitId={id} />;
}
