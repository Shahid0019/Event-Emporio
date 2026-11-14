import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import { storeSettings } from "@/lib/data/settings";
import { defaultDescription, defaultShareImage, defaultTitle, siteName } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import "./globals.css";

/*
 * Every font is a file in public/fonts, so builds and the dev server never need to reach
 * Google Fonts. Playfair, Pinyon and DM Sans are Google's OFL files (latin set, via Fontsource).
 */

/* Fallback for titles (Vintage Glamour lacks ₹ and some symbols); still has true italics. */
const playfair = localFont({
  src: [
    { path: "../../public/fonts/playfair-display-latin-wght-normal.woff2", weight: "400 900", style: "normal" },
    { path: "../../public/fonts/playfair-display-latin-wght-italic.woff2", weight: "400 900", style: "italic" },
  ],
  variable: "--font-playfair",
  display: "swap",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});

/* Calligraphic accent words ("for every occasion"); one weight. */
const pinyon = localFont({
  src: "../../public/fonts/pinyon-script-latin-400-normal.woff2",
  variable: "--font-pinyon",
  weight: "400",
  display: "swap",
  fallback: ["Snell Roundhand", "cursive"],
  adjustFontFallback: "Times New Roman",
});

/* Title serif (Vintage Glamour, one weight). It lacks ₹ ! ? & ( ) / # %, so those glyphs come from Playfair. */
const vintageGlamour = localFont({
  src: "../../public/fonts/VintageGlamourRegular-ALX27.ttf",
  variable: "--font-vintage-glamour",
  weight: "400",
  display: "swap",
  fallback: ["Playfair Display", "Georgia", "serif"],
});

/*
 * The site font (TBJ Cinea Sans, Extra Light, demo licence: personal use only — buy the commercial licence
 * before launch). The demo has letters and digits only, so punctuation and ₹ come from DM Sans. It has one
 * weight; declaring it as 400 lets the browser draw semibold/bold text (buttons, prices) thicker.
 */
const cinea = localFont({
  src: "../../public/fonts/TbjCineaSansDemoExtraLight-V4X3y.ttf",
  variable: "--font-cinea",
  weight: "400",
  display: "swap",
  fallback: ["DM Sans", "system-ui", "sans-serif"],
});

const dmSans = localFont({
  src: "../../public/fonts/dm-sans-latin-wght-normal.woff2",
  variable: "--font-dm-sans",
  weight: "100 1000",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

/*
 * Site-wide defaults. Public pages override these through `pageMetadata` (src/lib/seo.ts); no canonical
 * link or og:url here, or pages without their own would point search engines at the home page.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  applicationName: siteName,
  keywords: [
    "wedding essentials",
    "mehndi baskets",
    "bridal hampers",
    "Kashmiri wedding",
    "wedding disposables",
    "luxury gift hampers",
    "Srinagar",
  ],
  authors: [{ name: storeSettings.name, url: siteUrl }],
  creator: storeSettings.name,
  publisher: storeSettings.name,
  category: "shopping",
  openGraph: {
    type: "website",
    siteName,
    locale: "en_IN",
    title: defaultTitle,
    description: defaultDescription,
    images: [defaultShareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [{ url: defaultShareImage.url, alt: defaultShareImage.alt }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f8f6f1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      className={`${playfair.variable} ${vintageGlamour.variable} ${pinyon.variable} ${dmSans.variable} ${cinea.variable} antialiased`}
    >
      <body className="min-h-dvh bg-canvas text-ink">
        {children}
        <Toaster
          position="bottom-center"
          offset={{ bottom: "calc(var(--bottom-nav-h, 0px) + 24px)" }}
          mobileOffset={{ bottom: "calc(var(--bottom-nav-h, 0px) + 16px)" }}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                "flex w-full items-start gap-3 rounded-card bg-ink px-5 py-4 text-md text-canvas shadow-[0_20px_50px_-15px_rgb(0_0_0/0.4)] sm:w-[22rem]",
              title: "font-medium",
              description: "mt-0.5 text-canvas/70 text-sm",
              actionButton: "ml-auto shrink-0 text-2xs uppercase tracking-[0.14em] text-accent-soft underline underline-offset-4",
              error: "!bg-danger",
            },
          }}
        />
      </body>
    </html>
  );
}
