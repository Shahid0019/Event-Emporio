import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogHeader, CatalogResults, CatalogSkeleton } from "@/components/shop/catalog";
import { Breadcrumbs } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Shop All",
  description: "Shop mehndi baskets, bridal hampers, luxury gift hampers, customised gifts and decorative disposables from Events Emporio.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <div className="container-luxe pb-24">
      <CatalogHeader
        eyebrow="The full edit"
        title={
          <>
            Shop <em className="text-brand">all</em>
          </>
        }
        description="Every basket, hamper and finishing touch — filter by category, price or colour to find exactly what your celebration needs."
      >
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop" }]} />
      </CatalogHeader>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogResults searchParams={searchParams} basePath="/shop" />
      </Suspense>
    </div>
  );
}
