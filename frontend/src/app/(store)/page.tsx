import Link from "next/link";
import { CategoryGrid } from "@/components/home/category-grid";
import { Hero } from "@/components/home/hero";
import { OccasionCards } from "@/components/home/kit-sections";
import { Benefits, BrandStory, EditorialBanner, GiftingSection } from "@/components/home/sections";
import { ReviewWall, type WallReview } from "@/components/home/review-wall";
import { Reveal } from "@/components/motion/reveal";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductRail } from "@/components/product/product-rail";
import { SectionHeading } from "@/components/ui/primitives";
import { getBestsellers, getCategories, getNewArrivals } from "@/lib/catalog";
import { homepage } from "@/lib/data/content";
import { loadCatalog, loadContent, loadLatestReviews, primeKitCatalog } from "@/lib/db/queries";
import { storeSettings } from "@/lib/data/settings";
import { siteUrl } from "@/lib/site";

export const metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [categories, bestsellers, newArrivals, content, kitCatalog, latestReviews, catalog] = await Promise.all([
    getCategories(),
    getBestsellers(8),
    getNewArrivals(8),
    loadContent(),
    primeKitCatalog(),
    loadLatestReviews(),
    loadCatalog(),
  ]);
  // Links to a reviewed product only while it's on sale.
  const onSale = catalog.products.filter((p) => p.status === "active");
  const slugFor = (id?: string, name?: string) => onSale.find((p) => (id && p.id === id) || (name && p.name === name))?.slug;
  // Customers' published product reviews first (newest), then the testimonials switched on in the admin.
  const wallReviews: WallReview[] = [
    ...latestReviews.map((r) => ({
      id: r.id,
      name: r.displayName,
      rating: r.rating,
      title: r.title,
      text: r.text,
      product: r.productName,
      productSlug: slugFor(r.productId),
      verified: r.verifiedPurchase,
    })),
    ...content.testimonials
      .filter((t) => t.isApproved)
      .map((t) => ({
        id: t.id,
        name: t.displayName,
        rating: t.rating,
        text: t.text,
        product: t.productName,
        productSlug: slugFor(t.productId, t.productName),
      })),
  ];
  const picked = homepage.categoryHighlights.map((slug) => categories.find((c) => c.slug === slug)).filter((c) => c !== undefined);
  const highlighted = picked.length >= 3 ? picked : categories.slice(0, 5);

  const organization = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: storeSettings.name,
    url: siteUrl,
    description: storeSettings.shortBio,
    sameAs: [storeSettings.social.instagram],
    address: {
      "@type": "PostalAddress",
      addressLocality: storeSettings.location.city,
      addressRegion: storeSettings.location.region,
      addressCountry: "IN",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} />

      <Hero hero={content.hero} quickLinks={categories.slice(0, 4).map(({ slug, name }) => ({ slug, name }))} />

      <OccasionCards functions={kitCatalog.functions.filter((f) => f.isActive)} />

      <CategoryGrid categories={highlighted} />

      <section aria-labelledby="bestsellers-title" className="pb-[clamp(4rem,2.5rem+6vw,9rem)]">
        <div className="container-luxe">
          <SectionHeading
            eyebrow="Most loved"
            title={<span id="bestsellers-title">Bestsellers</span>}
            description="The pieces our customers return to season after season, celebration after celebration."
            action={
              <Link href="/shop?sort=popular" className="link-underline text-[0.72rem] font-medium uppercase tracking-[0.16em]">
                Shop bestsellers
              </Link>
            }
          />
          <Reveal className="mt-12 lg:mt-16">
            <ProductGrid products={bestsellers} />
          </Reveal>
        </div>
      </section>

      {/* <EditorialBanner /> */}

      {newArrivals.length > 0 && (
        <section aria-labelledby="new-title" className="section-y overflow-hidden">
          <div className="container-luxe">
            <SectionHeading
              eyebrow="Just in"
              title={
                <span id="new-title">
                  New <em className="text-brand">arrivals</em>
                </span>
              }
              action={
                <Link href="/shop?sort=newest" className="link-underline text-[0.72rem] font-medium uppercase tracking-[0.16em]">
                  View all new
                </Link>
              }
            />
            <div className="mt-10">
              <ProductRail products={newArrivals} label="New arrivals" />
            </div>
          </div>
        </section>
      )}

      <GiftingSection />
      {/* <BrandStory /> */}
      <Benefits />
      <ReviewWall reviews={wallReviews} />
    </>
  );
}
