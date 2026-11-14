import type { Metadata } from "next";
import { siteUrl } from "./site";

/**
 * Page metadata: title, description, canonical link, Open Graph and Twitter/X cards.
 *
 * Next merges metadata from layouts and pages shallowly, so a page that sets `openGraph` replaces the
 * root layout's version entirely (losing site name, locale and image). Every public page builds its
 * metadata through `pageMetadata` so each one carries the full set of tags.
 */

export const siteName = "khandr.com";
export const defaultTitle = "khandr.com — Wedding Essentials, Mehndi Baskets & Bridal Hampers";
export const defaultDescription =
  "Wedding essentials & décor from Srinagar — mehndi baskets, bridal hampers, luxury gifting and decorative disposables. Elevating traditions with a touch of class.";

export interface ShareImage {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
}

/** 1200×630 JPG cropped from the home hero (public/og/default.jpg); used when a page has no image of its own. */
export const defaultShareImage: ShareImage = {
  url: "/og/default.jpg",
  width: 1200,
  height: 630,
  alt: "Khandr wedding essentials — gift bags, boxes, cups and brass serveware on lit shelves",
};

/** Turns a site-relative path into a full URL; uploaded images (S3/CDN) are already absolute and pass through. */
export function absoluteUrl(src: string) {
  if (/^https?:\/\//i.test(src)) return src;
  return `${siteUrl}${src.startsWith("/") ? "" : "/"}${src}`;
}

interface PageMetadataInput {
  /** Page title without the site suffix (the root layout's template adds "| khandr.com"). Omit for the home page. */
  title?: string;
  /** Title for link previews, if it should differ from the <title> (defaults to `title`). */
  shareTitle?: string;
  description?: string;
  /** Site-relative path, e.g. "/about"; becomes the canonical link and og:url. */
  path: string;
  images?: ShareImage[];
}

export function pageMetadata({ title, shareTitle, description = defaultDescription, path, images }: PageMetadataInput): Metadata {
  const ogTitle = shareTitle ?? title;
  const fullTitle = ogTitle ? `${ogTitle} | ${siteName}` : defaultTitle;
  const shareImages = images?.length ? images : [defaultShareImage];
  return {
    ...(title && { title }),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName,
      locale: "en_IN",
      url: path,
      title: fullTitle,
      description,
      images: shareImages,
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: shareImages.map(({ url, alt }) => ({ url, alt })),
    },
  };
}
