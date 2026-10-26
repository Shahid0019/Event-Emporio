import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductReviews, type ShownReview } from "@/components/product/product-reviews";
import { ProductView } from "@/components/product/product-view";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { Breadcrumbs, Skeleton } from "@/components/ui/primitives";
import { categoryName, getProductBySlug, getProductSlugs, getRelatedProducts, priceRange, totalStock } from "@/lib/catalog";
import { loadContent, loadProductReviews } from "@/lib/db/queries";
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
  const [catName, content, customerReviews] = await Promise.all([
    categoryName(product.categorySlug),
    loadContent(),
    loadProductReviews(product.id),
  ]);
  // Customers' approved reviews first, then any testimonial the shop added for this product.
  const reviews: ShownReview[] = [
    ...customerReviews.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      rating: r.rating,
      title: r.title,
      text: r.text,
      verifiedPurchase: r.verifiedPurchase,
      date: r.createdAt,
    })),
    ...content.testimonials
      .filter((t) => t.isApproved && t.productName === product.name)
      .map((t) => ({ id: t.id, displayName: t.displayName, rating: t.rating, text: t.text })),
  ];
  const average = customerReviews.length ? customerReviews.reduce((sum, r) => sum + r.rating, 0) / customerReviews.length : 0;
  const { min, max } = priceRange(product);
  const url = `${siteUrl}/products/${product.slug}`;

  // Structured data reflects real price, stock and customers' approved reviews. Sample testimonials are never marked up.
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    sku: product.sku,
    image: product.images.map((i) => `${siteUrl}${i.src}`),
    brand: { "@type": "Brand", name: "Events Emporio" },
    category: catName,
    ...(customerReviews.length > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: average.toFixed(1), reviewCount: customerReviews.length },
    }),
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
        {(product.kit || product.categorySlug === "decorative-disposables") && (
          <p className="mt-10 rounded-card border border-line bg-raised px-5 py-4 text-[0.95rem]">
            Need it for a whole function?{" "}
            <Link href="/kit" className="link-underline font-medium text-brand">
              Build a kit
            </Link>{" "}
            — we count every item per trami.
          </p>
        )}
      </div>

      <ProductReviews productId={product.id} productSlug={product.slug} reviews={reviews} />

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
