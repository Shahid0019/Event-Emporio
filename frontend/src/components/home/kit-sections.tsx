import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { KitThumb } from "@/components/kit/kit-thumb";
import { SectionHeading } from "@/components/ui/primitives";
import type { KitFunction } from "@/lib/kit/config";
import { cn } from "@/lib/utils";

/** "Which function is it for?" — the shop's functions (set in the admin); each card opens the kit builder with it answered. */
export function OccasionCards({ functions }: { functions: KitFunction[] }) {
  return (
    <section aria-labelledby="occasions-title" className="">
      <div className="container-luxe">
        <SectionHeading
          title={
            <span id="occasions-title">
              Which <span className="text-brand">function</span> is it for ?
            </span>
          }
        />
        {functions.length > 0 && (
          <ul className={cn("mt-10 grid grid-cols-2 gap-3 sm:gap-5", functions.length % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
            {functions.map((f) => (
              <li key={f.id}>
                {/* Phones: a light card, photo on top, the name centred underneath.
                    Wider screens: full-bleed photo with a frosted panel and a clear "go" button. */}
                <Link
                  href={`/kit?occasion=${f.id}`}
                  className="group relative isolate flex h-full flex-col overflow-hidden rounded-card border border-line bg-raised shadow-[0_1px_2px_rgb(34_41_35/0.06)] transition-[transform,box-shadow] duration-300 ease-[var(--ease-luxe)] active:scale-[0.98] sm:aspect-[4/5] sm:h-auto sm:justify-end sm:rounded-sheet sm:border-0 sm:bg-surface sm:p-3 sm:shadow-[0_14px_34px_-22px_rgb(34_41_35/0.55)] can-hover:hover:-translate-y-1 can-hover:hover:shadow-[0_24px_44px_-24px_rgb(34_41_35/0.6)]"
                >
                  <span className="relative block aspect-[4/3] overflow-hidden bg-surface sm:absolute sm:inset-0 sm:-z-10 sm:aspect-auto">
                    {f.image ? (
                      <Image
                        src={f.image.src}
                        alt={f.image.alt}
                        fill
                        sizes="(min-width: 1024px) 23vw, 50vw"
                        className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-[1.06]"
                      />
                    ) : (
                      // No photo yet: the function's item picture on the light panel.
                      <span aria-hidden className="absolute inset-0 grid place-items-center sm:pb-16">
                        <KitThumb
                          itemId={f.icon ?? "dastarkhan"}
                          sizes="200px"
                          className="w-1/2 rounded-card bg-canvas transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-105"
                        />
                      </span>
                    )}
                    {/* A soft shade at the bottom so the frosted panel always sits on a calm background. */}
                    <span aria-hidden className="absolute inset-x-0 bottom-0 hidden h-1/2 bg-gradient-to-t from-ink/45 to-transparent sm:block" />
                  </span>
                  <span className="flex flex-1 items-center justify-center px-2 py-3 sm:flex-none sm:justify-start sm:gap-3 sm:rounded-card sm:bg-raised/85 sm:py-3 sm:pl-4 sm:pr-2 sm:shadow-[0_8px_24px_-12px_rgb(34_41_35/0.5)] sm:ring-1 sm:ring-white/60 sm:backdrop-blur-md">
                    <span className="min-w-0 sm:flex-1">
                      <span className="block truncate text-center font-sans text-md font-semibold leading-tight text-ink sm:text-left sm:text-base">
                        {f.name}
                      </span>
                      {/* {f.description && (
                        <span className="mt-0.5 line-clamp-2 text-xs leading-tight text-muted sm:text-sm">{f.description}</span>
                      )} */}
                    </span>
                    <span
                      aria-hidden
                      className="hidden size-9 shrink-0 place-items-center rounded-full bg-brand text-brand-ink transition-transform duration-300 group-hover:translate-x-0.5 sm:grid"
                    >
                      <ArrowRight className="size-4" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Any other function: one short row, styled like the cards above; opens the planner with it chosen. */}
        <Link
          href="/kit?occasion=other"
          className="group mt-3 flex min-h-16 items-center gap-3 rounded-card border border-line bg-raised px-4 py-3 shadow-[0_1px_2px_rgb(34_41_35/0.06)] transition-[transform,border-color,box-shadow] duration-300 active:scale-[0.99] can-hover:hover:border-line-strong can-hover:hover:shadow-[0_10px_28px_-16px_rgb(34_41_35/0.4)] sm:mt-5 sm:px-5"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
            <Sparkles aria-hidden className="size-5" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-sans text-md font-semibold leading-tight text-ink">
              {functions.length ? "Other function" : "Plan your function"}
            </span>
            <span className="mt-0.5 block truncate text-sm text-muted">Aqeeqah, engagement, dawat…</span>
          </span>
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-brand-ink transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight className="size-4" />
          </span>
        </Link>
      </div>
    </section>
  );
}
