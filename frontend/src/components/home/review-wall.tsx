import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowUpRight, BadgeCheck, Star } from "lucide-react";
import { SectionHeading } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/** A review on the home page: a customer's product review or a testimonial the shop added. */
export interface WallReview {
  id: string;
  name: string;
  rating?: number;
  title?: string;
  text: string;
  /** The product it's about: "on Gilded Rose Mehndi Basket", linked when it's still in the shop. */
  product?: string;
  productSlug?: string;
  verified?: boolean;
}

/** Each column holds at least this many cards (repeating reviews if needed), so its loop is always taller than the window. */
const MIN_PER_COLUMN = 4;
/** Seconds per card: every column moves at the same unhurried speed, however many cards it has. */
const SECONDS_PER_CARD = 12;

/**
 * "From our customers": every approved review in slowly scrolling columns
 * that loop forever (pure CSS — no JavaScript runs for the animation),
 * fading out at the top and bottom. Hovering pauses it; with reduced motion
 * it's a still list.
 */
export function ReviewWall({ reviews }: { reviews: WallReview[] }) {
  if (!reviews.length) return null;
  const rated = reviews.filter((r) => r.rating);
  const average = rated.length ? rated.reduce((s, r) => s + r.rating!, 0) / rated.length : 0;

  return (
    <section aria-labelledby="reviews-title" className="section-y overflow-hidden">
      <div className="container-luxe">
        <SectionHeading
          eyebrow="Kind words"
          title={<span id="reviews-title">From our customers</span>}
          description={
            rated.length >= 3 ? (
              <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <Stars rating={average} />
                <span>
                  <span className="font-medium text-ink">{average.toFixed(1)}</span> average from {rated.length} reviews
                </span>
              </span>
            ) : undefined
          }
          align="center"
        />

        {/* One column on phones, two on tablets, three on desktop — every review appears in each. */}
        <div className="mt-12 sm:mt-16">
          <Wall reviews={reviews} columns={1} className="md:hidden" />
          <Wall reviews={reviews} columns={2} className="hidden md:grid lg:hidden" />
          <Wall reviews={reviews} columns={3} className="hidden lg:grid" />
        </div>
      </div>
    </section>
  );
}

function Wall({ reviews, columns, className }: { reviews: WallReview[]; columns: number; className?: string }) {
  // Deal the reviews out across the columns, then top short columns up with repeats (hidden when the wall is still).
  const cols = Array.from({ length: columns }, (_, c) => reviews.filter((_, i) => i % columns === c).map((r) => ({ r, extra: false })));
  for (const [c, col] of cols.entries()) {
    for (let i = 0; col.length < MIN_PER_COLUMN; i++) col.push({ r: reviews[(c + i * columns + 1) % reviews.length], extra: true });
  }

  return (
    <div className={cn("grid gap-6", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-3", className)}>
      {cols.map((col, c) => (
        // Each column is its own window that fades out at the top and bottom.
        <div
          key={c}
          className="h-[40rem] overflow-hidden rounded-card [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] motion-reduce:h-auto motion-reduce:[mask-image:none]"
        >
          <div
            // Outer columns rise, the middle one falls, and each starts at a different point so cards never line up.
            // Hovering (or tabbing into) a column pauses just that column; the others keep moving.
            className={cn(
              "flex flex-col animate-marquee-up will-change-transform hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none",
              c === 1 && "[animation-direction:reverse]",
            )}
            style={{ "--marquee-duration": `${col.length * SECONDS_PER_CARD}s`, animationDelay: `-${c * 11}s` } as CSSProperties}
          >
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                aria-hidden={copy === 1 || undefined}
                className={cn("flex flex-col gap-6 pb-6", copy === 1 && "motion-reduce:hidden")}
              >
                {col.map(({ r, extra }, i) => (
                  <li
                    key={`${r.id}-${i}`}
                    className={cn(extra && "motion-reduce:hidden")}
                    aria-hidden={copy === 0 && extra ? true : undefined}
                  >
                    <ReviewCard review={r} repeat={copy === 1 || extra} />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** `repeat`: a copy that only keeps the loop going — its link is skipped when tabbing. */
function ReviewCard({ review: r, repeat }: { review: WallReview; repeat?: boolean }) {
  const initials = r.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <figure className="rounded-card border border-line bg-raised p-6 shadow-[0_18px_40px_-32px_rgb(36_32_32/0.35)] transition-[transform,border-color] duration-300 ease-[var(--ease-luxe)] can-hover:hover:-translate-y-0.5 can-hover:hover:border-line-strong">
      <figcaption className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft font-serif text-[1rem] text-accent-ink"
        >
          {initials}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[0.92rem] font-medium text-ink">
            {r.name}
            {r.verified && <BadgeCheck aria-label="Verified purchase" className="size-3.5 shrink-0 text-success" />}
          </span>
          {r.product && r.productSlug ? (
            <Link
              href={`/products/${r.productSlug}`}
              tabIndex={repeat ? -1 : undefined}
              className="group/link inline-flex max-w-full items-center gap-0.5 text-[0.78rem] text-muted transition-colors hover:text-brand"
            >
              <span className="truncate">
                on{" "}
                <span className="underline decoration-line-strong underline-offset-[3px] group-hover/link:decoration-brand">
                  {r.product}
                </span>
              </span>
              <ArrowUpRight
                aria-hidden
                className="size-3 shrink-0 transition-transform group-hover/link:-translate-y-px group-hover/link:translate-x-px"
              />
            </Link>
          ) : (
            <span className="block truncate text-[0.78rem] text-muted">{r.product ? `on ${r.product}` : "Customer"}</span>
          )}
        </span>
      </figcaption>
      {r.rating ? <Stars rating={r.rating} className="mt-4" /> : null}
      {r.title && <p className="mt-3 text-[0.92rem] font-medium text-ink">{r.title}</p>}
      <blockquote className={cn("font-serif text-[1.15rem] leading-snug text-ink", r.title ? "mt-1" : "mt-3")}>“{r.text}”</blockquote>
    </figure>
  );
}

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5 text-accent", className)} role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={cn("size-3.5", n <= Math.round(rating) ? "fill-current" : "text-line-strong")} />
      ))}
    </span>
  );
}
