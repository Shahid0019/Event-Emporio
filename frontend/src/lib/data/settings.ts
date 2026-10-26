/**
 * Brand basics that don't change from the admin. Contact details, shipping
 * charges and payment options are store settings in the database
 * (Admin → Settings, see src/lib/settings.ts).
 */
export const storeSettings = {
  name: "Events Emporio",
  tagline: "Elevating Traditions with a Touch of Class",
  /** Taken from the official Instagram bio. */
  shortBio: "Wedding Essentials & Décor — Mehndi Baskets, Bridal Hampers & Disposables.",
  location: { city: "Srinagar", region: "Jammu & Kashmir", country: "India" },
  social: {
    instagram: "https://www.instagram.com/eventsemporio/",
    instagramHandle: "@eventsemporio",
  },
  currency: "INR",
  pricesIncludeTax: true,
} as const;
