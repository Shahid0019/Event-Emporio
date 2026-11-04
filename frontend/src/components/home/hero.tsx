import { getImageProps } from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { HeroContent } from "@/lib/settings";

/**
 * Art-directed spread: a wide table with a cream panel on the left for
 * desktop, a portrait one with the cream space on top for phones. The text
 * sits on that cream space in each, so it never covers the food.
 */
// Only the <source> that matches is downloaded; eager + high priority as it's the LCP image.
const shared = { alt: "", sizes: "100vw", loading: "eager", fetchPriority: "high" } as const;
const desktop = getImageProps({ ...shared, src: "/images/hero/hero-desktop-v2.webp", width: 1500, height: 844 });
const mobile = getImageProps({ ...shared, src: "/images/hero/hero-mobile-v2.webp", width: 310, height: 400 });

// Previous spreads, kept for now to switch back: "/images/hero/hero-desktop-v1.webp" (1672×478),
// "/images/hero/table-spread-v2.webp" (2170×725), "/images/hero/table-spread.webp" (3200×893)

/**
 * Hero over the table spread. Entrance motion is pure CSS so the headline
 * is never hidden waiting for JavaScript (good for LCP).
 */
export function Hero({ hero }: { hero: HeroContent; quickLinks: { slug: string; name: string }[] }) {
  return (
    // Bottom margin gives the next section's heading room to breathe below the photo.
    <section aria-labelledby="hero-title" className="relative isolate mb-[clamp(2.5rem,1.5rem+4vw,5rem)] overflow-hidden bg-[#f4ede2]">
      <picture>
        <source media="(min-width: 48rem)" srcSet={desktop.props.srcSet} width={1500} height={844} />
        <img
          {...mobile.props}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-10 size-full animate-fade object-cover object-bottom md:object-[30%_60%]"
        />
      </picture>

      {/* Phones: text in the cream space above the plate (image is 310:400). Desktop: the cream panel on the left,
          at the photo's own 1500:844 shape but never taller than the screen below the header. */}
      <div className="container-luxe flex aspect-[310/400] flex-col items-center pt-[9%] text-center md:aspect-auto md:h-[clamp(24rem,calc(100vw*844/1500),calc(100svh-var(--header-h)))] md:items-start md:justify-center md:py-12 md:text-left">
        <div className="w-full md:max-w-[44%] xl:max-w-[40%]">
          {hero.eyebrow?.trim() && (
            <p className="eyebrow mb-3 inline-flex animate-rise items-center gap-2 text-accent-ink [animation-delay:100ms] max-md:text-[0.68rem] md:mb-5">
              <Sparkles aria-hidden className="size-3.5" />
              {hero.eyebrow}
            </p>
          )}

          <h1 id="hero-title" className="text-[clamp(2.4rem,1.2rem+5.5vw,3.4rem)] font-medium leading-[0.95] tracking-[-0.025em] md:text-[clamp(2.8rem,0.6rem+4.6vw,5.5rem)]">
            <span className="block animate-rise [animation-delay:200ms]">{hero.titleLines[0]}</span>
            <span className="block animate-rise italic text-brand [animation-delay:340ms]">{hero.titleLines[1]}</span>
          </h1>

          <div className="mt-5 flex w-full animate-rise items-center justify-center gap-2.5 [animation-delay:600ms] md:mt-8 md:justify-start md:gap-3">
            <Link
              href={hero.primaryCta.href}
              className={buttonVariants({ size: "lg", className: "px-5 shadow-[0_12px_30px_-12px_rgb(90_35_52/0.6)] max-md:h-11 sm:px-7" })}
            >
              {hero.primaryCta.label}
              <ArrowRight aria-hidden />
            </Link>
            <Link href="/kit" className={buttonVariants({ variant: "outline", size: "lg", className: "bg-canvas/80 px-5 backdrop-blur-sm max-md:h-11 sm:px-7" })}>
              Build my kit
            </Link>
          </div>

          {hero.secondaryCta.label?.trim() && hero.secondaryCta.href && hero.secondaryCta.href !== "/kit" && (
            <Link
              href={hero.secondaryCta.href}
              className="mt-5 inline-block animate-rise text-[0.72rem] font-medium uppercase tracking-[0.16em] link-underline [animation-delay:700ms] max-md:hidden"
            >
              {hero.secondaryCta.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
