import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Footer } from "@/components/layout/footer";
import { Header, type MegaMenuData } from "@/components/layout/header";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { SearchDialog } from "@/components/layout/search-dialog";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { getCategories, getCollections } from "@/lib/catalog";
import { announcements } from "@/lib/data/content";
import { storeSettings } from "@/lib/data/settings";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [categories, collections] = await Promise.all([getCategories(), getCollections()]);
  const featured = collections.find((c) => c.isFeatured) ?? collections[0];

  const menu: MegaMenuData = {
    categories: categories.map(({ slug, name }) => ({ slug, name })),
    collections: collections.map(({ slug, name }) => ({ slug, name })),
    feature: { title: featured.name, href: `/collections/${featured.slug}`, image: featured.image },
  };

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-ink focus:px-4 focus:py-3 focus:text-canvas"
      >
        Skip to content
      </a>
      <AnnouncementBar items={announcements.filter((a) => a.isActive)} />
      <Header menu={menu} />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <SearchDialog />
      <MobileMenu menu={menu} instagram={storeSettings.social.instagram} />
    </>
  );
}
