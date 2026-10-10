import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/ui/primitives";
import { getCategories } from "@/lib/catalog";
import { storeSettings } from "@/lib/data/settings";
import { footerNav } from "@/lib/site";
import { NewsletterForm } from "./newsletter-form";

export async function Footer() {
  const categories = await getCategories();
  const { contact, social, location } = storeSettings;

  return (
    <footer>
      <section aria-labelledby="newsletter-title" className="bg-surface">
        <div className="container-luxe grid items-end gap-10 py-20 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-6">
            <p className="eyebrow text-accent-ink">The guest list</p>
            <h2 id="newsletter-title" className="mt-5 text-h2">
              First to know, <em className="text-brand">first to gift.</em>
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-muted">
              New collections, seasonal edits and studio announcements — delivered occasionally, never spam.
            </p>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <NewsletterForm idPrefix="footer-nl" />
          </div>
        </div>
      </section>

      <div className="bg-brand-deep text-canvas">
        <div className="container-luxe pt-20 pb-10 sm:pt-24">
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <Logo tone="light" className="[&_span]:text-[2rem]" />
              <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-canvas/75">
                {storeSettings.shortBio} {storeSettings.tagline}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7 lg:pl-10">
              <FooterColumn title="Shop">
                {categories.map((c) => (
                  <FooterLink key={c.slug} href={`/category/${c.slug}`}>
                    {c.name}
                  </FooterLink>
                ))}
                <FooterLink href="/shop">All products</FooterLink>
              </FooterColumn>
              <FooterColumn title="Help">
                {footerNav.help.map((l) => (
                  <FooterLink key={l.href} href={l.href}>
                    {l.label}
                  </FooterLink>
                ))}
              </FooterColumn>
              <FooterColumn title="Studio">
                {footerNav.company.map((l) => (
                  <FooterLink key={l.href} href={l.href}>
                    {l.label}
                  </FooterLink>
                ))}
              </FooterColumn>
            </div>
          </div>

          <div className="mt-16 grid gap-8 border-t border-canvas/15 pt-10 text-[0.88rem] sm:grid-cols-3">
            <div>
              <p className="eyebrow mb-3 text-accent">Visit</p>
              <address className="not-italic leading-relaxed text-canvas/80">
                {contact.addressLine && (
                  <>
                    {contact.addressLine}
                    <br />
                  </>
                )}
                {location.city}, {location.region}
                <br />
                {location.country}
              </address>
            </div>
            <div>
              <p className="eyebrow mb-3 text-accent">Get in touch</p>
              <ul className="space-y-1.5 text-canvas/80">
                {contact.email && (
                  <li>
                    <a href={`mailto:${contact.email}`} className="hover:text-canvas">
                      {contact.email}
                    </a>
                  </li>
                )}
                {contact.phone && (
                  <li>
                    <a href={`tel:${contact.phone}`} className="hover:text-canvas">
                      {contact.phone}
                    </a>
                  </li>
                )}
                <li>
                  <Link href="/contact" className="hover:text-canvas">
                    Send us a message
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-3 text-accent">Follow</p>
              <a
                href={social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-canvas/80 hover:text-canvas"
              >
                Instagram {social.instagramHandle}
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-4 border-t border-canvas/15 pt-8 text-[0.75rem] text-canvas/60 md:flex-row md:items-center md:justify-between">
            <p>© {storeSettings.name}. All rights reserved.</p>
            <p>Secure online payments via Razorpay · Prices in INR</p>
            {storeSettings.isDemo && <p className="text-canvas/50">Demo storefront — products, prices and imagery are placeholders.</p>}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-5 text-accent">{title}</p>
      <ul className="space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-[0.9rem] text-canvas/75 transition-colors hover:text-canvas">
        {children}
      </Link>
    </li>
  );
}
