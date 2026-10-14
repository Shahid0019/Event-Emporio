import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MessageSquareText } from "lucide-react";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductView } from "@/components/product/product-view";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { Breadcrumbs, DemoNote, Skeleton } from "@/components/ui/primitives";
import { categoryName, getProductBySlug, getProductSlugs, getRelatedProducts, priceRange, totalStock } from "@/lib/catalog";
import { testimonials } from "@/lib/data/content";
import { siteUrl } from "@/lib/site";

export async function generateStaticParams() {
  return (await getProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description: product.shortDescription,
      images: product.images.map((i) => ({ url: i.src, width: i.width, height: i.height, alt: i.alt })),
    },
  };
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  );
}

function ProductSkeleton() {
  return (
    <div className="container-luxe grid gap-10 pb-24 pt-8 lg:grid-cols-12 lg:gap-12" role="status" aria-label="Loading product">
      <Skeleton className="aspect-[4/5] w-full lg:col-span-7" />
      <div className="space-y-4 lg:col-span-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-12 w-4/5" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}

async function ProductContent({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product, 4);
  const catName = categoryName(product.categorySlug);
  const reviews = testimonials.filter((t) => t.isApproved && t.productName === product.name);
  const { min, max } = priceRange(product);
  const url = `${siteUrl}/products/${product.slug}`;

  // Structured data reflects real price and stock. Sample reviews are never included as review markup.
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    sku: product.sku,
    image: product.images.map((i) => `${siteUrl}${i.src}`),
    brand: { "@type": "Brand", name: "Events Emporio" },
    category: catName,
    offers:
      min === max
        ? {
            "@type": "Offer",
            url,
            priceCurrency: "INR",
            price: (min / 100).toFixed(2),
            availability: totalStock(product) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          }
        : {
            "@type": "AggregateOffer",
            url,
            priceCurrency: "INR",
            lowPrice: (min / 100).toFixed(2),
            highPrice: (max / 100).toFixed(2),
            offerCount: product.variants.length,
            availability: totalStock(product) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: catName, item: `${siteUrl}/category/${product.categorySlug}` },
      { "@type": "ListItem", position: 3, name: product.name, item: url },
    ],
  };
  const ld = (o: object) => ({ __html: JSON.stringify(o).replace(/</g, "\\u003c") });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(productLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={ld(breadcrumbLd)} />

      <div className="container-luxe pb-24 pt-6 sm:pt-8">
        <Breadcrumbs
          className="mb-6 sm:mb-8"
          items={[{ label: "Home", href: "/" }, { label: catName, href: `/category/${product.categorySlug}` }, { label: product.name }]}
        />
        <ProductView product={product} categoryName={catName} />
        {product.categorySlug === "decorative-disposables" && (
          <p className="mt-10 rounded-card border border-line bg-raised px-5 py-4 text-[0.95rem]">
            Need it for a whole function?{" "}
            <Link href="/kit" className="link-underline font-medium text-brand">
              Build a kit
            </Link>{" "}
            — we count every item per trami.
          </p>
        )}
      </div>

      <section aria-labelledby="reviews-title" className="border-t border-line">
        <div className="container-luxe grid gap-10 py-20 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="reviews-title" className="text-h2">
              Reviews
            </h2>
            {reviews.length === 0 && <p className="mt-4 text-muted">No reviews yet for this product.</p>}
          </div>
          <div className="lg:col-span-8">
            {reviews.length > 0 ? (
              <>
                {reviews.some((r) => r.isSample) && <DemoNote className="mb-6">Sample review shown for preview only.</DemoNote>}
                <ul className="divide-y divide-line border-y border-line">
                  {reviews.map((r) => (
                    <li key={r.id} className="py-8">
                      {r.rating && (
                        <p className="text-accent-ink" aria-label={`Rated ${r.rating} out of 5`}>
                          {"★".repeat(r.rating)}
                          <span className="text-line-strong">{"★".repeat(5 - r.rating)}</span>
                        </p>
                      )}
                      <blockquote className="mt-3 font-serif text-[1.4rem] leading-snug">“{r.text}”</blockquote>
                      <p className="mt-4 text-[0.85rem] text-muted">{r.displayName}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="flex items-start gap-4 rounded-card border border-line bg-surface p-6 text-[0.92rem] text-muted">
                <MessageSquareText className="size-5 shrink-0 text-ink" />
                <p>
                  Bought this piece? Reviews from verified purchases will appear here once approved.{" "}
                  <Link href="/account/orders" className="underline underline-offset-4 hover:text-ink">
                    Review from your orders
                  </Link>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-title" className="container-luxe pb-24">
          <h2 id="related-title" className="border-t border-line pt-16 text-h2">
            You may also <em className="text-brand">love</em>
          </h2>
          <ProductGrid products={related} className="mt-10 lg:grid-cols-4" />
        </section>
      )}

      <RecentlyViewed excludeSlug={product.slug} />
    </>
  );
}
