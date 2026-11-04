import type { Metadata, Viewport } from "next";
import { DM_Sans, Pinyon_Script, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { siteUrl } from "@/lib/site";
import "./globals.css";

/* High-contrast display serif with true italics for the shop's headings. */
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

/* Calligraphic accent words ("for every occasion"); one weight. */
const pinyon = Pinyon_Script({
  variable: "--font-pinyon",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Events Emporio — Wedding Essentials, Mehndi Baskets & Bridal Hampers",
    template: "%s | Events Emporio",
  },
  description:
    "Wedding essentials & décor from Srinagar — mehndi baskets, bridal hampers, luxury gifting and decorative disposables. Elevating traditions with a touch of class.",
  applicationName: "Events Emporio",
  openGraph: {
    type: "website",
    siteName: "Events Emporio",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${playfair.variable} ${pinyon.variable} ${dmSans.variable} antialiased`}>
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
                "flex w-full items-start gap-3 rounded-card bg-ink px-5 py-4 text-[0.9rem] text-canvas shadow-[0_20px_50px_-15px_rgb(0_0_0/0.4)] sm:w-[22rem]",
              title: "font-medium",
              description: "mt-0.5 text-canvas/70 text-[0.82rem]",
              actionButton: "ml-auto shrink-0 text-[0.7rem] uppercase tracking-[0.14em] text-accent-soft underline underline-offset-4",
              error: "!bg-danger",
            },
          }}
        />
      </body>
    </html>
  );
}
