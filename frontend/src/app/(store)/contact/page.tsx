import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CircleHelp, Mail, MapPin, MessageCircle, Package, Phone, Sparkles, Truck } from "lucide-react";
import { ContactForm } from "@/components/forms/enquiry-forms";
import { ContentPage } from "@/components/layout/content-page";
import { storeSettings } from "@/lib/data/settings";
import { loadSettings } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Events Emporio about products, orders or custom requests.",
  alternates: { canonical: "/contact" },
};

/** Instagram's camera glyph (lucide no longer ships brand icons). */
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

const quickHelp = [
  { href: "/track-order", label: "Track an order", hint: "Order number and email", icon: Package },
  { href: "/faq", label: "Frequently asked questions", hint: "Orders, delivery, gifting", icon: CircleHelp },
  { href: "/custom-orders", label: "Custom & bulk orders", hint: "Hampers, favours, wedding kits", icon: Sparkles },
  { href: "/shipping-policy", label: "Shipping & delivery", hint: "Charges and dispatch", icon: Truck },
];

export default async function ContactPage() {
  const { social, location } = storeSettings;
  const { contact } = await loadSettings();
  const whatsapp = contact.whatsapp.replace(/\D/g, "");

  // Only the ways the shop has actually set up (Admin → Settings), plus Instagram.
  const channels = [
    whatsapp && {
      key: "whatsapp",
      label: "WhatsApp",
      value: contact.phone || `+${whatsapp}`,
      action: "Chat now",
      href: `https://wa.me/${whatsapp}`,
      external: true,
      icon: <MessageCircle />,
      featured: true,
    },
    contact.phone && {
      key: "phone",
      label: "Call us",
      value: contact.phone,
      action: "Call",
      href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`,
      external: false,
      icon: <Phone />,
    },
    contact.email && {
      key: "email",
      label: "Email",
      value: contact.email,
      action: "Write to us",
      href: `mailto:${contact.email}`,
      external: false,
      icon: <Mail />,
    },
    {
      key: "instagram",
      label: "Instagram",
      value: social.instagramHandle,
      action: "Follow & message",
      href: social.instagram,
      external: true,
      icon: <InstagramIcon />,
    },
  ].filter((c): c is Exclude<typeof c, "" | false> => Boolean(c));

  return (
    <ContentPage
      eyebrow="Contact"
      title={
        <>
          Let&apos;s <em className="text-brand">talk</em>
        </>
      }
      intro="Questions about a product, an order, or something you'd like made for your function? Reach us the way that suits you, or send a note below."
    >
      <section aria-label="Ways to reach us" className="mb-14">
        <ul
          className={`grid gap-3 sm:grid-cols-2 ${channels.length >= 4 ? "lg:grid-cols-4" : channels.length === 3 ? "lg:grid-cols-3" : ""}`}
        >
          {channels.map((c) => (
            <li key={c.key}>
              <a
                href={c.href}
                {...(c.external && { target: "_blank", rel: "noopener noreferrer" })}
                className={`group flex h-full flex-col rounded-card border p-5 transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgb(36_32_32/0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  "featured" in c && c.featured ? "border-brand bg-brand text-brand-ink" : "border-line bg-raised hover:border-ink"
                }`}
              >
                <span
                  className={`grid size-11 place-items-center rounded-full [&_svg]:size-5 [&_svg]:stroke-[1.5] ${
                    "featured" in c && c.featured ? "bg-brand-ink/15" : "bg-surface text-brand"
                  }`}
                >
                  {c.icon}
                </span>
                <span className="mt-5 text-[0.7rem] font-medium uppercase tracking-[0.16em] opacity-75">{c.label}</span>
                <span className="mt-1 truncate text-[1.05rem] font-medium">{c.value}</span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-[0.72rem] font-medium uppercase tracking-[0.14em]">
                  {c.action}
                  {c.external ? (
                    <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  ) : (
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  )}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <section aria-labelledby="message-title" className="rounded-card border border-line bg-raised p-6 sm:p-10 lg:col-span-8">
          <h2 id="message-title" className="font-serif text-[2rem] leading-tight">
            Send us a message
          </h2>
          <p className="mt-2 text-[0.95rem] text-muted">We read every message and reply to the email you give us.</p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </section>

        <aside className="space-y-10 lg:col-span-4">
          <div>
            <h2 className="eyebrow text-accent-ink">Visit us</h2>
            <div className="mt-4 flex gap-3">
              <MapPin className="mt-0.5 size-5 shrink-0 stroke-[1.5] text-brand" />
              <p className="leading-relaxed">
                {contact.address && (
                  <>
                    {contact.address}
                    <br />
                  </>
                )}
                {location.city}, {location.region}
                <br />
                {location.country}
              </p>
            </div>
          </div>

          <div>
            <h2 className="eyebrow text-accent-ink">Quick answers</h2>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {quickHelp.map(({ href, label, hint, icon: Icon }) => (
                <li key={href}>
                  <Link href={href} className="group flex items-center gap-3 py-4">
                    <Icon className="size-5 shrink-0 stroke-[1.5] text-muted group-hover:text-brand" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.95rem] group-hover:text-brand">{label}</span>
                      <span className="block text-[0.8rem] text-muted">{hint}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </ContentPage>
  );
}
