import type { MetadataRoute } from "next";
import { getCategories, getProductSlugs } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, slugs] = await Promise.all([getCategories(), getProductSlugs()]);
  const statics = [
    "",
    "/shop",
    "/kit",
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
    ...slugs.map((slug) => ({ url: `${siteUrl}/products/${slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
