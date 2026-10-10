import Link from "next/link";
import { CategoryGrid } from "@/components/home/category-grid";
import { Hero } from "@/components/home/hero";
import { Benefits, BrandStory, EditorialBanner, GiftingSection, InstagramGallery, Testimonials } from "@/components/home/sections";
import { Reveal } from "@/components/motion/reveal";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductRail } from "@/components/product/product-rail";
import { SectionHeading } from "@/components/ui/primitives";
import { getBestsellers, getCategories, getNewArrivals } from "@/lib/catalog";
import { homepage } from "@/lib/data/content";
import { storeSettings } from "@/lib/data/settings";
import { siteUrl } from "@/lib/site";

export const metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [categories, bestsellers, newArrivals] = await Promise.all([getCategories(), getBestsellers(8), getNewArrivals(8)]);
  const highlighted = homepage.categoryHighlights.map((slug) => categories.find((c) => c.slug === slug)).filter((c) => c !== undefined);

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

      <Hero quickLinks={categories.slice(0, 4).map(({ slug, name }) => ({ slug, name }))} />

      <CategoryGrid categories={highlighted} />

      <section aria-labelledby="bestsellers-title" className="pb-[clamp(4rem,2.5rem+6vw,9rem)]">
        <div className="container-luxe">
          <SectionHeading
            eyebrow="Most loved"
            title={<span id="bestsellers-title">Bestsellers</span>}
            description="The pieces our customers return to — season after season, celebration after celebration."
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

      <EditorialBanner />

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
      <BrandStory />
      <Benefits />
      <Testimonials />
      <InstagramGallery />
    </>
  );
}
