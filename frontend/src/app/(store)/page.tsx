import Link from "next/link";
import { CategoryGrid } from "@/components/home/category-grid";
import { Hero } from "@/components/home/hero";
import { OccasionCards } from "@/components/home/kit-sections";
import { BrandStory, EditorialBanner, GiftingSection } from "@/components/home/sections";
import { ReviewWall, type WallReview } from "@/components/home/review-wall";
import { SearchBar } from "@/components/layout/search-bar";
import { Reveal } from "@/components/motion/reveal";
import { ProductGrid } from "@/components/product/product-grid";
import { SectionHeading } from "@/components/ui/primitives";
import { getBestsellers, getCategories, inShop } from "@/lib/catalog";
import { homepage } from "@/lib/data/content";
import { loadCatalog, loadContent, loadLatestReviews, primeKitCatalog } from "@/lib/db/queries";
import { storeSettings } from "@/lib/data/settings";
import { siteUrl } from "@/lib/site";

export const metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [categories, bestsellers, content, kitCatalog, latestReviews, catalog] = await Promise.all([
    getCategories(),
    getBestsellers(8),
    loadContent(),
    primeKitCatalog(),
    loadLatestReviews(),
    loadCatalog(),
  ]);
  // Links to a reviewed product only while it's on sale in the shop (kit items are sold through the kit).
  const onSale = catalog.products.filter(inShop);
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
  const highlighted = picked.length >= 3 ? picked : categories.slice(0, 6);

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

      {/* Phones: search first, as in a shopping app. */}
      <div className="container-luxe pb-3 md:hidden">
        <SearchBar />
      </div>

      <Hero hero={content.hero} quickLinks={categories.slice(0, 4).map(({ slug, name }) => ({ slug, name }))} />

      <OccasionCards functions={kitCatalog.functions.filter((f) => f.isActive)} />

      <CategoryGrid categories={highlighted} />

      {/* <section aria-labelledby="bestsellers-title" className="pb-[clamp(4rem,2.5rem+6vw,9rem)]">
        <div className="container-luxe">
          <SectionHeading
            eyebrow="Most loved"
            title={<span id="bestsellers-title">Bestsellers</span>}
            description="The pieces our customers return to season after season, celebration after celebration."
            action={
              <Link href="/shop?sort=popular" className="link-underline text-xs font-medium uppercase tracking-[0.16em]">
                Shop bestsellers
              </Link>
            }
          />
          <Reveal className="mt-12 lg:mt-16">
            <ProductGrid products={bestsellers} />
          </Reveal>
        </div>
      </section> */}

      {/* <EditorialBanner /> */}

      {/* <GiftingSection /> */}
      {/* <BrandStory /> */}
      <ReviewWall reviews={wallReviews} />
    </>
  );
}
