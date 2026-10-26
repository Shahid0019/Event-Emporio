import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { HeroContent } from "@/lib/settings";

/** The table spread behind the hero: wazwan plate on a runner, with the shop's disposables around it. */
const background = {
  src: "/images/hero/table-spread.webp",
  width: 3200,
  height: 893,
  alt: "A wazwan plate on a patterned runner, surrounded by cups, boxes, napkins and cutlery",
};

/**
 * Centred hero over a full-width table spread. The headline sits on a soft
 * ivory glow so it stays readable over the photo; the picture's white
 * background blends into the page. Entrance motion is pure CSS so the
 * headline is never hidden waiting for JavaScript (good for LCP).
 */
export function Hero({ hero, quickLinks }: { hero: HeroContent; quickLinks: { slug: string; name: string }[] }) {
  return (
    <section aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* Phones: the spread is a band under the text. Wider screens: it fills the whole hero. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-[38%] sm:h-[44%] lg:inset-0 lg:h-auto">
        <Image
          src={background.src}
          alt=""
          fill
          preload
          sizes="100vw"
          className="animate-fade object-cover object-center mix-blend-multiply"
        />
        {/* Ivory glow behind the words; the edges of the spread stay clear. */}
        <div className="absolute inset-0 bg-gradient-to-b from-canvas via-canvas/20 to-transparent lg:hidden" />
        {/* Melts into the section below instead of ending on a hard line. */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-canvas to-transparent" />
        <div className="absolute inset-0 hidden bg-[radial-gradient(ellipse_44%_62%_at_50%_50%,var(--canvas)_0%,color-mix(in_srgb,var(--canvas)_68%,transparent)_45%,transparent_100%)] lg:block" />
      </div>

      <div className="container-luxe flex min-h-[calc(100svh-var(--header-h)-2.25rem)] flex-col items-center justify-start pb-[42%] pt-12 text-center sm:pb-[46%] sm:pt-16 lg:min-h-[clamp(36rem,calc(100vw/3.58+8rem),52rem)] lg:justify-center lg:pb-28 lg:pt-16">
        {hero.eyebrow?.trim() && (
          <p className="eyebrow mb-6 inline-flex animate-rise items-center gap-2 rounded-full bg-canvas/80 px-4 py-2 text-accent-ink backdrop-blur-sm [animation-delay:100ms]">
            <Sparkles aria-hidden className="size-3.5" />
            {hero.eyebrow}
          </p>
        )}

        <h1 id="hero-title" className="text-display font-medium tracking-[-0.025em]">
          <span className="block animate-rise [animation-delay:200ms]">{hero.titleLines[0]}</span>
          <span className="block animate-rise italic text-brand [animation-delay:340ms]">{hero.titleLines[1]}</span>
        </h1>

        {/* <p className="mx-auto mt-6 max-w-xl animate-rise text-[1.05rem] leading-relaxed text-ink/75 [animation-delay:480ms] sm:text-[1.15rem]">
          {hero.description}
        </p> */}

        <div className="mt-9 flex w-full animate-rise flex-col items-stretch gap-3 [animation-delay:600ms] sm:w-auto sm:flex-row sm:items-center sm:justify-center">
          <Link
            href={hero.primaryCta.href}
            className={buttonVariants({ size: "lg", className: "shadow-[0_12px_30px_-12px_rgb(90_35_52/0.6)]" })}
          >
            {hero.primaryCta.label}
            <ArrowRight aria-hidden />
          </Link>
          <Link href="/kit" className={buttonVariants({ variant: "outline", size: "lg", className: "bg-canvas/80 backdrop-blur-sm" })}>
            Build my kit
          </Link>
        </div>

        {hero.secondaryCta.label?.trim() && hero.secondaryCta.href && (
          <Link
            href={hero.secondaryCta.href}
            className="mt-5 animate-rise text-[0.72rem] font-medium uppercase tracking-[0.16em] link-underline [animation-delay:700ms]"
          >
            {hero.secondaryCta.label}
          </Link>
        )}
      </div>
    </section>
  );
}
