import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Parallax, Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { DemoNote, SectionHeading } from "@/components/ui/primitives";
import { gallery, homepage, testimonials } from "@/lib/data/content";
import { storeSettings } from "@/lib/data/settings";

/* ------------------------- Editorial banner -------------------------- */
export function EditorialBanner() {
  const e = homepage.editorial;
  return (
    <section aria-labelledby="editorial-title" className="section-y overflow-hidden bg-surface">
      <div className="container-luxe grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <Parallax className="relative aspect-[4/5] overflow-hidden rounded-media sm:aspect-[5/4] lg:col-span-7 lg:aspect-[6/7]">
          <div className="absolute inset-0">
            <Image src={e.image.src} alt={e.image.alt} fill sizes="(min-width: 1024px) 56vw, 100vw" className="object-cover" />
          </div>
        </Parallax>

        <Reveal className="relative lg:col-span-5 lg:pl-8 xl:pl-14">
          <p className="eyebrow text-accent-ink">{e.eyebrow}</p>
          <h2 id="editorial-title" className="mt-6 text-h1">
            The Art of <br className="hidden sm:block" />
            <em className="text-brand">Thoughtful</em> Gifting.
          </h2>
          <p className="mt-8 max-w-md text-[1.05rem] leading-relaxed text-muted">{e.body}</p>
          <Link href={e.cta.href} className={buttonVariants({ variant: "secondary", className: "mt-10" })}>
            {e.cta.label}
          </Link>
          <div className="relative mt-14 hidden aspect-[3/4] w-40 overflow-hidden rounded-card bg-canvas lg:block xl:w-48">
            <Image src={e.detailImage.src} alt={e.detailImage.alt} fill sizes="12rem" className="object-cover" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------- Personalised gifting ---------------------- */
export function GiftingSection() {
  const g = homepage.gifting;
  return (
    <section aria-labelledby="gifting-title" className="section-y bg-brand-deep text-canvas">
      <div className="container-luxe grid gap-16 lg:grid-cols-12 lg:gap-10">
        <div className="relative order-2 min-h-[26rem] lg:order-1 lg:col-span-5">
          <div className="absolute left-0 top-0 aspect-[3/4] w-[62%] overflow-hidden rounded-media bg-brand">
            <Image src={g.images[0].src} alt={g.images[0].alt} fill sizes="(min-width: 1024px) 26vw, 60vw" className="object-cover" />
          </div>
          <div className="absolute bottom-0 right-0 aspect-[3/4] w-[48%] overflow-hidden rounded-media border-[10px] border-brand-deep bg-brand">
            <Image src={g.images[1].src} alt={g.images[1].alt} fill sizes="(min-width: 1024px) 20vw, 46vw" className="object-cover" />
          </div>
        </div>

        <div className="order-1 lg:order-2 lg:col-span-7 lg:pl-10">
          <p className="eyebrow text-accent">{g.eyebrow}</p>
          <h2 id="gifting-title" className="mt-6 text-h1">
            Made Personal. <br />
            <em className="text-accent-soft">Made Memorable.</em>
          </h2>
          <p className="mt-7 max-w-lg text-[1.02rem] leading-relaxed text-canvas/75">{g.intro}</p>

          <Reveal stagger={0.08}>
            <ol className="mt-12 grid gap-x-10 sm:grid-cols-2">
              {g.options.map((o, i) => (
                <li key={o.title} data-reveal className="border-t border-canvas/20 py-6">
                  <span className="font-serif text-lg italic text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 font-serif text-2xl">{o.title}</h3>
                  <p className="mt-2 text-[0.92rem] leading-relaxed text-canvas/70">{o.body}</p>
                </li>
              ))}
            </ol>
          </Reveal>
          <Link href={g.cta.href} className={buttonVariants({ variant: "light", className: "mt-8" })}>
            {g.cta.label}
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ Brand story -------------------------- */
export function BrandStory() {
  const s = homepage.story;
  return (
    <section aria-labelledby="story-title" className="section-y">
      <div className="container-luxe grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <Reveal className="lg:col-span-6 lg:col-start-1 xl:col-span-5">
          <div className="relative aspect-[4/5] overflow-hidden rounded-media bg-surface">
            <Image src={s.image.src} alt={s.image.alt} fill sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover" />
          </div>
        </Reveal>
        <Reveal className="lg:col-span-6 lg:pl-10 xl:col-span-6 xl:col-start-7 xl:pl-0">
          <p className="eyebrow text-accent-ink">{s.eyebrow}</p>
          <h2 id="story-title" className="mt-6 text-h2">
            Every Celebration Deserves Something <em className="text-brand">Extraordinary.</em>
          </h2>
          {s.body.map((para) => (
            <p key={para} className="mt-6 max-w-lg text-[1.05rem] leading-relaxed text-muted">
              {para}
            </p>
          ))}
          <p className="mt-10 font-serif text-2xl italic text-accent-ink">“{storeSettings.tagline}.”</p>
          <Link href={s.cta.href} className={buttonVariants({ variant: "link", className: "mt-10 text-[0.72rem]" })}>
            {s.cta.label}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------- Benefits --------------------------- */
export function Benefits() {
  return (
    <section aria-label="Why shop with us" className="border-y border-line">
      <ul className="mx-auto grid max-w-[92rem] gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        {homepage.benefits.map((b, i) => (
          <li key={b.title} className="bg-canvas px-[var(--gutter)] py-10 sm:px-8 xl:px-10">
            <span className="font-serif text-lg italic text-accent-ink">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-2 font-serif text-[1.55rem]">{b.title}</h3>
            <p className="mt-2 max-w-xs text-[0.92rem] leading-relaxed text-muted">{b.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------ Testimonials ------------------------- */
export function Testimonials() {
  const approved = testimonials.filter((t) => t.isApproved);
  if (!approved.length) return null;
  const hasSamples = approved.some((t) => t.isSample);

  return (
    <section aria-labelledby="reviews-title" className="section-y">
      <div className="container-luxe">
        <SectionHeading eyebrow="Kind words" title={<span id="reviews-title">From our customers</span>} align="center" />
        {hasSamples && (
          <DemoNote className="mx-auto mt-5 max-w-md text-center">
            Sample reviews for preview only — replace with approved customer reviews.
          </DemoNote>
        )}
        <Reveal stagger={0.1} className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-3">
          {approved.map((t) => (
            <figure key={t.id} data-reveal className="flex flex-col bg-canvas px-6 py-10 md:px-10">
              {t.rating ? (
                <p className="mb-6 h-5 text-accent-ink" aria-label={`Rated ${t.rating} out of 5`}>
                  {"★".repeat(t.rating)}
                  <span className="text-line-strong">{"★".repeat(5 - t.rating)}</span>
                </p>
              ) : (
                <span aria-hidden className="mb-6 block h-5" />
              )}
              <blockquote className="font-serif text-[1.45rem] leading-snug text-ink">“{t.text}”</blockquote>
              <figcaption className="mt-auto pt-8 text-[0.82rem] text-muted">
                <span className="font-medium text-ink">{t.displayName}</span>
                {t.productName && <span className="block">on {t.productName}</span>}
              </figcaption>
            </figure>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* --------------------------------- Gallery --------------------------- */
export function InstagramGallery() {
  return (
    <section aria-labelledby="gallery-title" className="pb-[clamp(4rem,2.5rem+6vw,9rem)]">
      <div className="container-luxe">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-accent-ink">Follow along</p>
            <h2 id="gallery-title" className="mt-4 text-h2">
              <a href={storeSettings.social.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-brand">
                {storeSettings.social.instagramHandle}
              </a>
            </h2>
          </div>
          <a
            href={storeSettings.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.16em] link-underline"
          >
            Open Instagram <ArrowUpRight className="size-3.5" />
          </a>
        </div>
        <Reveal stagger={0.05} className="mt-10 grid grid-cols-3 gap-1.5 sm:gap-3 lg:grid-cols-6">
          {gallery.map((g) => (
            <Link key={g.id} href={g.href} data-reveal className="group relative aspect-square overflow-hidden rounded-card bg-surface">
              <Image
                src={g.image.src}
                alt={g.image.alt}
                fill
                sizes="(min-width: 1024px) 16vw, 33vw"
                className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-luxe)] group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/25" />
            </Link>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
