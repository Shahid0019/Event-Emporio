import type { MetadataRoute } from "next";
import { getCategories, inShop } from "@/lib/catalog";
import { loadCatalog } from "@/lib/db/queries";
import { absoluteUrl } from "@/lib/seo";
import { siteUrl } from "@/lib/site";

/** Public, indexable pages. Private and transactional pages are kept out here and in robots.ts. */
const statics: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/shop", priority: 0.9, changeFrequency: "daily" },
  { path: "/kit", priority: 0.8, changeFrequency: "weekly" },
  { path: "/custom-orders", priority: 0.6, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
  { path: "/shipping-policy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/returns-policy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy-policy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, catalog] = await Promise.all([getCategories(), loadCatalog()]);
  const products = catalog.products.filter(inShop);
  return [
    ...statics.map(({ path, priority, changeFrequency }) => ({ url: `${siteUrl}${path}`, changeFrequency, priority })),
    ...categories.map((c) => ({
      url: `${siteUrl}/category/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: [absoluteUrl(c.image.src)],
    })),
    // Image sitemap entries help product photos show up in Google Images.
    ...products.map((p) => ({
      url: `${siteUrl}/products/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: p.images.map((i) => absoluteUrl(i.src)),
    })),
  ];
}
