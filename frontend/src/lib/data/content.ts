import type { Coupon, Review } from "../types";
import { demoImage } from "./images";

/**
 * Homepage & CMS content — DEMO DATA, managed via /admin/banners once the
 * backend exists. Copy is either the client brief's suggested wording or
 * taken from the official Instagram bio; nothing here claims facts about
 * the business that haven't been supplied.
 */

export const announcements = [
  {
    id: "a1",
    message: "The Mehndi Night Edit is here — dressed baskets, favours & trays",
    href: "/collections/mehndi-night",
    isActive: true,
  },
  { id: "a2", message: "Planning something bespoke? Request a custom hamper quote", href: "/custom-orders", isActive: true },
];

export const homepage = {
  hero: {
    eyebrow: "Wedding Essentials & Décor",
    titleLines: ["Celebrate", "Beautifully."],
    description: "Thoughtfully curated essentials for moments worth remembering — from mehndi baskets to bridal hampers.",
    primaryCta: { label: "Shop Now", href: "/shop" },
    secondaryCta: { label: "Explore Collections", href: "/collections" },
    image: demoImage("hero-florals", "Lush arrangement of deep pink roses and burgundy blooms"),
    inset: demoImage("gift-candlelight", "Gift box tied with a black ribbon beside glowing candles"),
    insetCaption: { label: "The Bridal Edit", href: "/collections/the-bridal-edit" },
  },
  categoryHighlights: ["mehndi-baskets", "bridal-hampers", "luxury-hampers", "customised-gifts", "decorative-disposables"],
  editorial: {
    eyebrow: "Thoughtful Gifting",
    title: "The Art of Thoughtful Gifting.",
    body: "A gift says what words sometimes can't. We wrap every piece with the same care you'd give it yourself — ribbon tied by hand, a note written in your words, and a box worth keeping long after it's opened.",
    cta: { label: "Explore the Collection", href: "/collections/thoughtful-gifting" },
    image: demoImage("candlelit-table", "Candlelit table dressed with linen and greenery"),
    detailImage: demoImage("macaron-box", "Pastel macarons in a ribboned gift box"),
  },
  gifting: {
    eyebrow: "Personalised Gifting",
    title: "Made Personal. Made Memorable.",
    intro:
      "Where a product supports it, you can add a personal touch at checkout. For anything more involved, tell us your brief and we'll come back with a quote.",
    options: [
      { title: "Gift messages", body: "A handwritten-style card with your words, on selected products." },
      { title: "Custom packaging", body: "Colours, ribbons and boxes matched to your celebration." },
      { title: "Personalised hampers", body: "Names, contents and themes curated to your brief." },
      { title: "Bulk & event quantities", body: "Favours and hampers for every guest, quoted to order." },
    ],
    cta: { label: "Request a Custom Order", href: "/custom-orders" },
    images: [
      demoImage("gift-kraft", "Kraft-wrapped gift with a black velvet bow"),
      demoImage("gift-gold-ribbon", "Kraft gift boxes with gold ribbon and a blank card"),
    ],
  },
  story: {
    eyebrow: "Our Story",
    title: "Every Celebration Deserves Something Extraordinary.",
    body: [
      "Events Emporio is a Srinagar-based studio for wedding essentials and décor — mehndi baskets, bridal hampers and the finishing touches that make a celebration feel considered.",
      "Our approach is simple: honour the traditions, and present them with a touch of class.",
    ],
    cta: { label: "Discover Our Story", href: "/about" },
    image: demoImage("mehndi-portrait", "Woman smiling while showing fresh henna on her hands"),
  },
  benefits: [
    { title: "Secure payments", body: "Checkout is processed through an encrypted payment gateway." },
    { title: "Carefully selected", body: "Every piece is chosen and checked before it's packed." },
    { title: "Personalised gifting", body: "Messages, packaging and custom hampers on request." },
    { title: "Dedicated support", body: "Real people to help you plan, from first question to delivery." },
  ],
};

/**
 * SAMPLE REVIEWS — clearly flagged `isSample`. They are rendered with a
 * visible "sample" notice and are never emitted as review structured data.
 * Replace with real, customer-approved reviews before launch.
 */
export const testimonials: Review[] = [
  {
    id: "t1",
    displayName: "Sample customer",
    rating: 5,
    text: "The mehndi baskets arrived beautifully arranged and every guest asked where they were from. Exactly the finish we wanted.",
    productName: "Gilded Rose Mehndi Basket",
    isSample: true,
    isApproved: true,
  },
  {
    id: "t2",
    displayName: "Sample customer",
    rating: 5,
    text: "Our bridal trousseau boxes looked so elegant in the photographs. The ribbon, the lining — everything felt considered.",
    productName: "Signature Bridal Trousseau Box",
    isSample: true,
    isApproved: true,
  },
  {
    id: "t3",
    displayName: "Sample customer",
    text: "They helped us put together hampers for both families within our budget, and kept us updated the whole way.",
    productName: "Personalised Name Hamper",
    isSample: true,
    isApproved: true,
  },
];

export const gallery = [
  { id: "g1", image: demoImage("mehndi-celebration", "Mehndi celebration with henna-decorated hands"), href: "/collections/mehndi-night" },
  { id: "g2", image: demoImage("gift-candlelight", "Wrapped gift in candlelight"), href: "/products/signature-bridal-trousseau-box" },
  { id: "g3", image: demoImage("macarons-stack", "Stacked pastel macarons"), href: "/products/macaron-tower-favours" },
  { id: "g4", image: demoImage("brass-tray", "Ornate brass serving tray"), href: "/products/heritage-brass-serving-tray" },
  { id: "g5", image: demoImage("rose-basket", "Basket of blush roses"), href: "/products/gilded-rose-mehndi-basket" },
  { id: "g6", image: demoImage("candlelit-table", "Candlelit reception table"), href: "/products/candlelit-centrepiece-set" },
];

export const faqs = [
  {
    group: "Orders",
    items: [
      {
        q: "Can I change my order after placing it?",
        a: "Contact us as soon as possible. If your order hasn't moved into processing yet, we'll do our best to update it.",
      },
      {
        q: "Do you take custom or bulk orders?",
        a: "Yes. Use the Custom Orders form with your occasion, quantities and timeline, and we'll reply with a quote. Custom work is priced individually rather than at checkout.",
      },
      { q: "Can I add a gift message?", a: "Products that support gift messages show a message field on the product page." },
    ],
  },
  {
    group: "Delivery",
    items: [
      {
        q: "Where do you deliver?",
        a: "Delivery coverage and timelines will be published here once confirmed. Until then, please contact us before ordering for time-sensitive events.",
      },
      {
        q: "How do I track my order?",
        a: "Use the Track Order page with your order number and email, or open the order from your account.",
      },
    ],
  },
  {
    group: "Payments",
    items: [
      {
        q: "Which payment methods do you accept?",
        a: "Online payments are processed securely through Razorpay at checkout. We never store your card details.",
      },
      { q: "Is cash on delivery available?", a: "Cash on delivery isn't currently offered." },
    ],
  },
];

/** DEMO coupons — validated with the same rules the server will apply. */
export const coupons: Coupon[] = [
  {
    code: "WELCOME10",
    type: "percentage",
    value: 10,
    minSubtotal: 150000,
    maxDiscount: 50000,
    startsAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2027-12-31T23:59:59.000Z",
    usageLimit: 500,
    usedCount: 128,
    perCustomerLimit: 1,
    isActive: true,
  },
  {
    code: "MEHNDI500",
    type: "fixed",
    value: 50000,
    minSubtotal: 400000,
    startsAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2027-06-30T23:59:59.000Z",
    usedCount: 41,
    categorySlugs: ["mehndi-baskets"],
    isActive: true,
  },
  {
    code: "SUMMER15",
    type: "percentage",
    value: 15,
    minSubtotal: 200000,
    startsAt: "2026-04-01T00:00:00.000Z",
    expiresAt: "2026-06-30T23:59:59.000Z",
    usedCount: 212,
    isActive: true,
  },
];

export function findCoupon(code: string) {
  return coupons.find((c) => c.code === code.trim().toUpperCase());
}
