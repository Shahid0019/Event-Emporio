import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/primitives";
import { demoImage } from "@/lib/data/images";
import { storeSettings } from "@/lib/data/settings";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Events Emporio is a Srinagar-based studio for wedding essentials and décor — mehndi baskets, bridal hampers and disposables.",
  alternates: { canonical: "/about" },
};

const hero = demoImage("mehndi-hands", "Hands decorated with intricate henna patterns");
const detail = demoImage("brass-pitcher", "Engraved brass pitcher with dried flowers");

const pillars = [
  {
    title: "Tradition, honoured",
    body: "Mehndi nights, bridal exchanges and family gatherings carry meaning. Our pieces are made to belong in those moments.",
  },
  {
    title: "Presented with class",
    body: "Ribbon, texture and proportion matter. Every basket and hamper is finished so it looks as considered as it feels.",
  },
  {
    title: "Made around you",
    body: "From a single gift note to hampers for every guest, we tailor what we can and quote clearly for the rest.",
  },
];

export default function AboutPage() {
  return (
    <>
      <div className="container-luxe pt-8 sm:pt-12">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
        <header className="grid gap-10 pb-16 pt-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="eyebrow text-accent-ink">Our story</p>
            <h1 className="mt-5 text-display">
              Elevating <em className="text-brand">traditions</em>
            </h1>
          </div>
          <p className="text-[1.08rem] leading-relaxed text-muted lg:col-span-4 lg:col-start-9">
            {storeSettings.name} is a {storeSettings.location.city}-based studio for wedding essentials and décor — mehndi baskets, bridal
            hampers and disposables — with one quiet ambition: elevating traditions with a touch of class.
          </p>
        </header>
      </div>

      <div className="relative mx-auto aspect-[16/9] max-h-[78vh] w-[calc(100%-2*var(--gutter))] max-w-[calc(92rem-2*var(--gutter))] overflow-hidden rounded-media bg-surface sm:aspect-[21/9]">
        <Image src={hero.src} alt={hero.alt} fill preload sizes="100vw" className="object-cover" />
      </div>

      <section className="container-luxe section-y grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="text-h2">
            What we <em className="text-brand">believe</em>
          </h2>
        </div>
        <Reveal stagger={0.1} className="space-y-0 lg:col-span-7">
          {pillars.map((p, i) => (
            <div key={p.title} data-reveal className="grid gap-4 border-t border-line py-8 sm:grid-cols-[4rem_1fr]">
              <span className="font-serif text-2xl italic text-accent-ink">0{i + 1}</span>
              <div>
                <h3 className="font-serif text-[1.9rem] leading-tight">{p.title}</h3>
                <p className="mt-3 max-w-lg leading-relaxed text-muted">{p.body}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      <section className="bg-surface">
        <div className="container-luxe section-y grid items-center gap-12 lg:grid-cols-12">
          <div className="relative aspect-[4/3] overflow-hidden rounded-media lg:col-span-6">
            <Image src={detail.src} alt={detail.alt} fill sizes="(min-width: 1024px) 48vw, 100vw" className="object-cover" />
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <h2 className="text-h2">Planning something special?</h2>
            <p className="mt-5 leading-relaxed text-muted">
              Tell us about your celebration and we&apos;ll help you put together baskets, hampers and favours that suit it — and your
              budget.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/custom-orders" className={buttonVariants()}>
                Start a custom order
              </Link>
              <a
                href={storeSettings.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                See our work on Instagram
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
