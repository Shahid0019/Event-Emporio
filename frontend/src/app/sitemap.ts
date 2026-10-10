import type { MetadataRoute } from "next";
import { getCategories, getCollections, getProductSlugs } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, collections, slugs] = await Promise.all([getCategories(), getCollections(), getProductSlugs()]);
  const statics = [
    "",
    "/shop",
    "/collections",
    "/about",
    "/contact",
    "/custom-orders",
    "/faq",
    "/shipping-policy",
    "/returns-policy",
    "/privacy-policy",
    "/terms",
  ];
  return [
    ...statics.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.6 })),
    ...categories.map((c) => ({ url: `${siteUrl}/category/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...collections.map((c) => ({ url: `${siteUrl}/collections/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...slugs.map((slug) => ({ url: `${siteUrl}/products/${slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
