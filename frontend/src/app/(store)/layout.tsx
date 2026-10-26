import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { Footer } from "@/components/layout/footer";
import { Header, type MegaMenuData } from "@/components/layout/header";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { SearchDialog } from "@/components/layout/search-dialog";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { StoreDataProvider } from "@/components/providers/store-data";
import { getCategories } from "@/lib/catalog";
import { storeSettings } from "@/lib/data/settings";
import { loadContent, loadSettings, primeKitCatalog } from "@/lib/db/queries";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [categories, content, settings, kitCatalog] = await Promise.all([
    getCategories(),
    loadContent(),
    loadSettings(),
    primeKitCatalog(),
  ]);
  const menu: MegaMenuData = {
    categories: categories.map(({ slug, name }) => ({ slug, name })),
  };

  return (
    <StoreDataProvider settings={settings} kitCatalog={kitCatalog}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-ink focus:px-4 focus:py-3 focus:text-canvas"
      >
        Skip to content
      </a>
      <AnnouncementBar items={content.announcements.filter((a) => a.isActive)} />
      <Header menu={menu} />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer />
      <CartDrawer />
      <SearchDialog />
      <MobileMenu menu={menu} instagram={storeSettings.social.instagram} />
    </StoreDataProvider>
  );
}
