import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogResults, CatalogSkeleton } from "@/components/shop/catalog";
import { Breadcrumbs } from "@/components/ui/primitives";
import { getCollections } from "@/lib/catalog";
import { collectionBySlug } from "@/lib/data/categories";

export async function generateStaticParams() {
  return (await getCollections()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const collection = collectionBySlug(slug);
  if (!collection) notFound();
  return {
    title: collection.name,
    description: collection.description,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: { images: [{ url: collection.image.src, alt: collection.image.alt }] },
  };
}

export default function CollectionPage({ params, searchParams }: PageProps<"/collections/[slug]">) {
  return (
    <Suspense
      fallback={
        <div className="container-luxe pb-24 pt-12">
          <CatalogSkeleton />
        </div>
      }
    >
      <CollectionContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function CollectionContent({ params, searchParams }: Pick<PageProps<"/collections/[slug]">, "params" | "searchParams">) {
  const { slug } = await params;
  const collection = collectionBySlug(slug);
  if (!collection) notFound();

  return (
    <div className="pb-24">
      <section className="relative isolate mx-auto flex min-h-[26rem] w-[calc(100%-2*var(--gutter))] max-w-[calc(92rem-2*var(--gutter))] items-end overflow-hidden rounded-media bg-ink text-canvas sm:min-h-[34rem]">
        <Image
          src={collection.image.src}
          alt={collection.image.alt}
          fill
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
          className="-z-10 object-cover opacity-80"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/80 via-ink/25 to-ink/10" />
        <div className="container-luxe pb-12 pt-24 sm:pb-16">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "Collections", href: "/collections" }, { label: collection.name }]}
            className="[&_a]:text-canvas/75 [&_a:hover]:text-canvas [&_span]:text-canvas [&_svg]:text-canvas/50"
          />
          <p className="eyebrow mt-8 text-accent-soft">{collection.tagline}</p>
          <h1 className="mt-4 max-w-3xl text-h1">{collection.name}</h1>
          <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-canvas/80">{collection.description}</p>
        </div>
      </section>
      <div className="container-luxe pt-12">
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogResults
            searchParams={searchParams}
            basePath={`/collections/${collection.slug}`}
            fixed={{ collection: collection.slug }}
          />
        </Suspense>
      </div>
    </div>
  );
}
