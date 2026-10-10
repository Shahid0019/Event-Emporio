import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ContactForm } from "@/components/forms/enquiry-forms";
import { ContentPage } from "@/components/layout/content-page";
import { storeSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Events Emporio about products, orders or custom requests.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const { contact, social, location } = storeSettings;
  return (
    <ContentPage
      eyebrow="Contact"
      title={
        <>
          Let&apos;s <em className="text-brand">talk</em>
        </>
      }
      intro="Questions about a product, an order, or something you'd like made? Send us a note and we'll get back to you."
    >
      <div className="grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
        <aside className="space-y-10 lg:col-span-4 lg:col-start-9">
          <div>
            <h2 className="eyebrow text-accent-ink">Studio</h2>
            <p className="mt-3 leading-relaxed">
              {contact.addressLine && (
                <>
                  {contact.addressLine}
                  <br />
                </>
              )}
              {location.city}, {location.region}
              <br />
              {location.country}
            </p>
          </div>
          {(contact.email || contact.phone) && (
            <div>
              <h2 className="eyebrow text-accent-ink">Direct</h2>
              <ul className="mt-3 space-y-1">
                {contact.email && (
                  <li>
                    <a href={`mailto:${contact.email}`} className="underline underline-offset-4">
                      {contact.email}
                    </a>
                  </li>
                )}
                {contact.phone && (
                  <li>
                    <a href={`tel:${contact.phone}`} className="underline underline-offset-4">
                      {contact.phone}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
          <div>
            <h2 className="eyebrow text-accent-ink">Instagram</h2>
            <a
              href={social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-serif text-2xl hover:text-brand"
            >
              {social.instagramHandle} <ArrowUpRight className="size-4" />
            </a>
          </div>
          <div className="border-t border-line pt-8">
            <h2 className="eyebrow text-accent-ink">Quick help</h2>
            <ul className="mt-3 space-y-2 text-[0.95rem]">
              <li>
                <Link href="/track-order" className="hover:text-brand">
                  Track an order
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-brand">
                  Frequently asked questions
                </Link>
              </li>
              <li>
                <Link href="/custom-orders" className="hover:text-brand">
                  Custom & bulk orders
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </ContentPage>
  );
}
