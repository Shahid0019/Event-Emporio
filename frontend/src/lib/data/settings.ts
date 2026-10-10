/**
 * Store settings — DEMO VALUES.
 * Contact details, shipping rules and policies must be confirmed by
 * Events Emporio before launch. Fields left `null` are deliberately
 * unset so the UI never displays invented information.
 */
export const storeSettings = {
  name: "Events Emporio",
  tagline: "Elevating Traditions with a Touch of Class",
  /** Taken from the official Instagram bio. */
  shortBio: "Wedding Essentials & Décor — Mehndi Baskets, Bridal Hampers & Disposables.",
  location: { city: "Srinagar", region: "Jammu & Kashmir", country: "India" },
  contact: {
    email: null as string | null,
    phone: null as string | null,
    whatsapp: null as string | null,
    addressLine: null as string | null,
  },
  social: {
    instagram: "https://www.instagram.com/eventsemporio/",
    instagramHandle: "@eventsemporio",
  },
  currency: "INR",
  pricesIncludeTax: true,
  shipping: {
    /** DEMO — flat rate in paise, replace with the confirmed shipping zones. */
    flatRate: 15000,
    /** DEMO — set to null to disable the free-shipping threshold entirely. */
    freeShippingThreshold: 499900 as number | null,
    methods: [
      { id: "standard", label: "Standard delivery", description: "Dispatch timeline confirmed after order", price: 15000 },
      { id: "express", label: "Priority dispatch", description: "Packed and dispatched first", price: 35000 },
    ],
  },
  payments: {
    razorpayEnabled: true,
    /** Cash on delivery stays off until the business approves eligibility rules. */
    codEnabled: false,
  },
  isDemo: true,
} as const;

export type ShippingMethodId = (typeof storeSettings.shipping.methods)[number]["id"];
