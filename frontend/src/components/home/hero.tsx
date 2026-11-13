import { getImageProps } from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ShoppingBag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { HeroContent } from "@/lib/settings";
import { cn } from "@/lib/utils";

/**
 * The shop photo: shelves of supplies on the right, a plain cream wall on the
 * left. The words sit on that wall, so they never cover the products.
 */
// Eager + high priority as it's the LCP image. Phones and desktop use the same file, so it downloads once.
// Next serves it as AVIF/WebP at the width each screen needs: on phones it is a card inside the page
// margins (a little under the screen width), from md up it fills the hero. A 150-byte blurred copy shows
// at once while the photo loads.
const shared = {
  alt: "",
  sizes: "(min-width: 48rem) 100vw, calc(100vw - 2rem)",
  loading: "eager",
  fetchPriority: "high",
  placeholder: "blur",
  blurDataURL: "data:image/webp;base64,UklGRo4AAABXRUJQVlA4IIIAAAAwBACdASoYAAwAPu1iqU2ppaOiMAgBMB2JaACdMoSA2B7R5tXq5l/hu5gA/uGW6jA6j6Ju84nzsXQw3QWyv/zKpo0TUy96AwCfRGLPFyjpJAOVbYki38JTOL6lMwQNscWb3E1c36f9fdszZt2OiatgvwxRS9cnMkspjDQxDB0bfMAA",
} as const;
// const desktop = getImageProps({ ...shared, src: "/images/hero/hero-desktop-v3.webp", width: 1671, height: 941 });
// const mobile = getImageProps({ ...shared, src: "/images/hero/hero-mobile-v3.webp", width: 1100, height: 1430 });
// const photo = getImageProps({ ...shared, src: "/images/hero/ElegantLuxury.webp", width: 1760, height: 893 });
const photo = getImageProps({ ...shared, src: "/images/hero/elegant-luxury-v2.webp", width: 1760, height: 893 });

// Previous spreads, kept for now to switch back: "/images/hero/ElegantLuxury.webp" (1760×893),
// "/images/hero/hero-desktop-v3.webp" (1671×941),
// "/images/hero/hero-mobile-v3.webp" (1100×1430), "/images/hero/hero-desktop-v2.webp" (1500×844),
// "/images/hero/hero-mobile-v2.webp" (310×400), "/images/hero/hero-desktop-v1.webp" (1672×478),
// "/images/hero/table-spread-v2.webp" (2170×725), "/images/hero/table-spread.webp" (3200×893)

/** Hero wording, from the client's mock-up: the same on phones and desktop. */
const phone = {
  title: ["Everything for", "your function.", "In one place."],
  note: "Great everyday prices.",
  noteEnd: ["The same for", "everyone."],
  shop: "Shop Products",
};

// Phone buttons: tall, well rounded, sentence case, with a larger icon (as in the mock-up). The label shrinks a
// little on small phones, and the icons drop on the narrowest (under 375px) so "Plan My Function" always fits.
const phoneButton =
  "h-12 min-w-0 flex-1 gap-1.5 rounded-[0.85rem] px-2.5 normal-case tracking-normal text-[clamp(0.875rem,0.55rem+1.4vw,1rem)] font-semibold [&_svg]:size-5 [&_svg]:stroke-[1.75] max-[374px]:[&_svg]:hidden";

/**
 * Hero on the shop photo. Phones: the photo with the words on the wall, the two
 * buttons underneath. Desktop: the words and buttons on the wall, over a taller photo.
 * Entrance motion is pure CSS so the headline is never hidden waiting for JavaScript (good for LCP).
 */
export function Hero({ hero }: { hero: HeroContent; quickLinks: { slug: string; name: string }[] }) {
  return (
    // Bottom margin gives the next section's heading room to breathe below the photo.
    // From md up the photo runs under the floating header tiles; phones keep the search bar between them.
    <section aria-label="Welcome" className="relative isolate mb-[clamp(2.5rem,1.5rem+4vw,5rem)] overflow-hidden md:-mt-[var(--header-h)] md:bg-[#f4ede2]">
      {/* Phones: a rounded photo card inside the page margins. Desktop: the photo fills the hero. */}
      <div className="@container relative mx-[var(--gutter)] overflow-hidden rounded-card md:static md:mx-0 md:overflow-visible md:rounded-none">
        {/* Already optimised through getImageProps; a plain <img> lets one file serve both layouts. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...photo.props}
          alt=""
          aria-hidden
          className="block aspect-[6/5] w-full animate-fade object-cover object-left md:absolute md:inset-0 md:-z-10 md:aspect-auto md:size-full md:object-[30%_60%]"
        />

        {/* A soft cream wash over the left of the photo, so the words stay crisp over the flowers and shelves. */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[68%] bg-gradient-to-r from-[#f7f1e8]/90 via-[#f7f1e8]/65 to-transparent md:-z-10 md:w-[60%] md:from-[#f7f1e8]/90 md:via-[#f7f1e8]/70"
        />

        {/* Phones: the words on the wall, left of the shelves. The headline uses the section-heading size
            (text-h2, 24px on phones) so every heading on the page matches; the 6:5 photo leaves the wall wide enough for it. */}
        <div className="absolute inset-y-0 left-0 flex w-[66%] flex-col justify-center pl-[6%] pb-[2%] md:hidden">
          <h1 className="animate-rise text-h2 font-bold max-[380px]:text-xl leading-[1.12] tracking-[-0.01em] text-ink [animation-delay:150ms]">
            {phone.title.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          {/* <span aria-hidden className="mt-[max(0.6rem,3.2cqw)] block h-[2px] w-[max(1.75rem,8cqw)] animate-rise rounded-full bg-[#8dbda6] [animation-delay:260ms]" /> */}
          <p className="mt-2.5 animate-rise text-sm font-medium max-[380px]:text-xs leading-[1.4] text-ink/90 [animation-delay:320ms]">
            {phone.note}
            <br />
            {phone.noteEnd[0]} <strong className="font-bold text-ink">{phone.noteEnd[1]}</strong>
          </p>
        </div>
      </div>

      {/* Phones: the two ways in, side by side under the photo. */}
      <div className="container-luxe mt-4 flex animate-rise gap-2.5 [animation-delay:450ms] md:hidden">
        <Link
          href={hero.primaryCta.href}
          className={buttonVariants({ size: "lg", className: cn(phoneButton, "shadow-[0_12px_30px_-12px_rgb(66_94_42/0.6)]") })}
        >
          <ShoppingBag aria-hidden />
          {phone.shop}
        </Link>
        <Link
          href="/kit"
          className={buttonVariants({
            variant: "outline",
            size: "lg",
            className: cn(phoneButton, "border-[1.5px] border-brand-deep bg-raised text-brand-deep hover:border-brand-deep hover:bg-surface"),
          })}
        >
          <CalendarDays aria-hidden />
          Plan My Function
        </Link>
      </div>

      {/* Desktop: the cream wall on the left, at the photo's own shape but never taller than the screen;
          the text keeps clear of the header tiles. */}
      <div className="container-luxe hidden md:flex md:h-[clamp(26rem,calc(100vw*893/1760),100svh)] md:items-center md:pb-12 md:pt-[calc(var(--header-h)+1.5rem)]">
        <div className="md:max-w-[74%] xl:max-w-[90%]">
          {/* Same words as on phones: headline, description and button labels. */}
          <h1 className="text-[clamp(2.4rem,0.9rem+3.1vw,4.25rem)] font-bold leading-[1.08] tracking-[-0.015em] text-ink">
            {phone.title.map((line, i) => (
              <span key={line} className="block animate-rise" style={{ animationDelay: `${200 + i * 110}ms` }}>
                {line}
              </span>
            ))}
          </h1>

          <p className="mt-6 max-w-md animate-rise text-[clamp(1.05rem,0.7rem+0.6vw,1.3rem)] font-medium leading-[1.5] text-ink/85 [animation-delay:560ms]">
            {phone.note}
            <br />
            {phone.noteEnd[0]} <strong className="font-bold text-ink">{phone.noteEnd[1]}</strong>
          </p>

          <div className="mt-8 flex animate-rise items-center gap-3 [animation-delay:680ms]">
            <Link href={hero.primaryCta.href} className={buttonVariants({ size: "lg", className: "px-7 shadow-[0_12px_30px_-12px_rgb(66_94_42/0.6)]" })}>
              {phone.shop}
              <ArrowRight aria-hidden />
            </Link>
            <Link href="/kit" className={buttonVariants({ variant: "outline", size: "lg", className: "bg-canvas/80 px-7 backdrop-blur-sm" })}>
              Plan My Function
            </Link>
          </div>

          {hero.secondaryCta.label?.trim() && hero.secondaryCta.href && hero.secondaryCta.href !== "/kit" && (
            <Link
              href={hero.secondaryCta.href}
              className="mt-5 inline-block animate-rise text-xs font-medium uppercase tracking-[0.16em] link-underline [animation-delay:700ms]"
            >
              {hero.secondaryCta.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
