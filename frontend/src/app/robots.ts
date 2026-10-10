import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private, transactional and infinitely-combinable URLs stay out of the index.
      disallow: ["/admin", "/account", "/cart", "/checkout", "/wishlist", "/search", "/api/", "/*?*sort=", "/*?*min=", "/*?*colour="],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
