import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { homepage } from "@/lib/data/content";
import { storeSettings } from "@/lib/data/settings";

/**
 * Split editorial hero. Entrance motion is pure CSS so the headline is
 * never hidden waiting for JavaScript (good for LCP and resilience).
 */
export function Hero({ quickLinks }: { quickLinks: { slug: string; name: string }[] }) {
  const { hero } = homepage;
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="container-luxe grid items-center gap-x-10 gap-y-14 pb-20 pt-8 sm:pt-12 lg:min-h-[calc(100svh-var(--header-h)-2.25rem)] lg:grid-cols-12 lg:pb-16 lg:pt-6">
        <div className="relative z-10 lg:col-span-6 xl:col-span-6">
          <p className="eyebrow animate-rise text-accent-ink [animation-delay:100ms]">
            {hero.eyebrow}
            <span className="hidden sm:inline">
              <span className="mx-3 inline-block h-px w-8 translate-y-[-0.25em] bg-accent align-middle" aria-hidden />
              {storeSettings.location.city}
            </span>
          </p>

          <h1 id="hero-title" className="mt-7 text-display font-medium tracking-[-0.025em]">
            <span className="block animate-rise [animation-delay:200ms]">{hero.titleLines[0]}</span>
            <span className="block animate-rise pl-[0.55em] italic text-brand [animation-delay:340ms]">{hero.titleLines[1]}</span>
          </h1>

          <p className="mt-8 max-w-md animate-rise text-[1.05rem] leading-relaxed text-muted [animation-delay:480ms] sm:text-[1.12rem]">
            {hero.description}
          </p>

          <div className="mt-10 flex animate-rise flex-wrap items-center gap-x-8 gap-y-5 [animation-delay:600ms]">
            <Link href={hero.primaryCta.href} className={buttonVariants({ size: "lg" })}>
              {hero.primaryCta.label}
            </Link>
            <Link href="/kit" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Build my kit
            </Link>
            <Link href={hero.secondaryCta.href} className={buttonVariants({ variant: "link", className: "text-[0.72rem]" })}>
              {hero.secondaryCta.label}
            </Link>
          </div>

          <nav
            aria-label="Popular categories"
            className="mt-14 hidden animate-fade border-t border-line pt-6 [animation-delay:800ms] sm:block"
          >
            <ul className="flex flex-wrap gap-x-7 gap-y-2 text-[0.85rem] text-muted">
              {quickLinks.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="transition-colors hover:text-ink">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="relative lg:col-span-6">
          <div className="relative ml-auto aspect-[4/5] w-[88%] max-w-[36rem] animate-unveil overflow-hidden rounded-media bg-surface [animation-delay:150ms] sm:w-[78%] lg:w-[86%] xl:mr-6">
            <Image src={hero.image.src} alt={hero.image.alt} fill preload sizes="(min-width: 1024px) 42vw, 88vw" className="object-cover" />
          </div>

          <Link
            href={hero.insetCaption.href}
            className="group absolute bottom-[-2.5rem] left-0 w-[44%] max-w-[15rem] animate-rise rounded-card bg-canvas p-2.5 pb-0 shadow-[0_20px_50px_-25px_rgb(36_32_32/0.35)] [animation-delay:900ms] sm:bottom-[-1.5rem] sm:w-[36%] lg:bottom-[6%] lg:left-[2%]"
          >
            <span className="relative block aspect-[3/4] overflow-hidden rounded-control bg-surface">
              <Image
                src={hero.inset.src}
                alt={hero.inset.alt}
                fill
                sizes="(min-width: 1024px) 15vw, 40vw"
                className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-105"
              />
            </span>
            <span className="flex items-center justify-between gap-2 py-3 text-[0.68rem] font-medium uppercase tracking-[0.16em]">
              {hero.insetCaption.label}
              <ArrowRight className="size-3.5 transition-transform duration-500 group-hover:translate-x-1" />
            </span>
          </Link>

          <p
            aria-hidden
            className="absolute right-[calc(var(--gutter)*-0.85)] top-1/2 hidden -translate-y-1/2 rotate-180 font-serif text-[0.95rem] italic tracking-[0.04em] text-muted [writing-mode:vertical-rl] xl:block"
          >
            {storeSettings.tagline}
          </p>
        </div>
      </div>
    </section>
  );
}
