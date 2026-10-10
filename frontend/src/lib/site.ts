/** Canonical site origin used for metadata, sitemap and structured data. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const mainNav = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop", mega: true },
  { label: "Collections", href: "/collections" },
  { label: "Wedding Essentials", href: "/category/wedding-essentials" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export const footerNav = {
  help: [
    { label: "Track Order", href: "/track-order" },
    { label: "FAQ", href: "/faq" },
    { label: "Shipping Policy", href: "/shipping-policy" },
    { label: "Returns & Refunds", href: "/returns-policy" },
    { label: "Contact Us", href: "/contact" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Custom & Bulk Orders", href: "/custom-orders" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms & Conditions", href: "/terms" },
  ],
};
