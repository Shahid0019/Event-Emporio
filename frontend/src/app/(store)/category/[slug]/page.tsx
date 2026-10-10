import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogResults, CatalogSkeleton } from "@/components/shop/catalog";
import { Breadcrumbs } from "@/components/ui/primitives";
import { getCategories } from "@/lib/catalog";
import { categoryBySlug } from "@/lib/data/categories";
import { siteUrl } from "@/lib/site";

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();
  return {
    title: category.seoTitle ?? category.name,
    description: category.seoDescription ?? category.description,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: { images: [{ url: category.image.src, alt: category.image.alt }] },
  };
}

export default function CategoryPage({ params, searchParams }: PageProps<"/category/[slug]">) {
  return (
    <Suspense
      fallback={
        <div className="container-luxe pb-24 pt-12">
          <CatalogSkeleton />
        </div>
      }
    >
      <CategoryContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CategoryContent({ params, searchParams }: Pick<PageProps<"/category/[slug]">, "params" | "searchParams">) {
  const { slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${siteUrl}/shop` },
      { "@type": "ListItem", position: 3, name: category.name, item: `${siteUrl}/category/${category.slug}` },
    ],
  };

  return (
    <div className="pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }} />
      <header className="container-luxe grid items-end gap-8 pb-12 pt-8 sm:pt-12 md:grid-cols-12 md:pb-16">
        <div className="md:col-span-7">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/shop" }, { label: category.name }]} />
          <p className="eyebrow mt-8 text-accent-ink">Category</p>
          <h1 className="mt-4 text-h1">{category.name}</h1>
          <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-muted">{category.description}</p>
        </div>
        <div className="relative hidden aspect-[16/10] overflow-hidden rounded-media bg-surface md:col-span-5 md:block">
          <Image
            src={category.image.src}
            alt={category.image.alt}
            fill
            loading="eager"
            fetchPriority="high"
            sizes="40vw"
            className="object-cover"
          />
        </div>
      </header>
      <div className="container-luxe">
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogResults searchParams={searchParams} basePath={`/category/${category.slug}`} fixed={{ category: category.slug }} />
        </Suspense>
      </div>
    </div>
  );
}
