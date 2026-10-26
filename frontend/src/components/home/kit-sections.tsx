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
          eyebrow="Build my kit"
          title={
            <span id="occasions-title">
              Which <em className="text-brand">function</em> is it for?
            </span>
          }
          description="Pick the function and tell us how many guests. We count every dastarkhan, glass, box and bag for you."
        />
        {functions.length > 0 && (
          <ul className={cn("mt-10 grid grid-cols-2 gap-3 sm:gap-5", functions.length % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
            {functions.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/kit?occasion=${f.id}`}
                  className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-media bg-surface p-4 text-canvas sm:p-6"
                >
                  {f.image ? (
                    <Image
                      src={f.image.src}
                      alt={f.image.alt}
                      fill
                      sizes="(min-width: 1024px) 23vw, 50vw"
                      className="-z-10 object-cover transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-105"
                    />
                  ) : (
                    // No photo yet: the function's item picture on the brand colour.
                    <span aria-hidden className="absolute inset-0 -z-10 grid place-items-center bg-brand-deep">
                      <KitThumb
                        itemId={f.icon ?? "dastarkhan"}
                        sizes="200px"
                        className="w-1/2 -translate-y-1/4 rounded-card bg-canvas/95 transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-105"
                      />
                    </span>
                  )}
                  <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-ink/30 to-ink/0" />
                  <span className="font-serif text-[1.6rem] leading-tight sm:text-[2rem]">{f.name}</span>
                  {f.description && <span className="mt-1 text-[0.85rem] text-canvas/90">{f.description}</span>}
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-[0.16em]">
                    Build kit <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/kit"
          className="group mt-3 flex items-center gap-4 rounded-media border border-dashed border-line-strong p-4 transition-colors hover:border-ink hover:bg-surface/60 sm:mt-5 sm:p-5"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
            <Sparkles aria-hidden className="size-5" strokeWidth={1.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-serif text-[1.35rem] leading-tight">
              {functions.length ? "Something else?" : "Your own function."} <em className="text-brand">Name it yourself.</em>
            </span>
            <span className="mt-0.5 block text-[0.85rem] text-muted">
              Aqeeqah, engagement, dawat — type your function&apos;s name and we&apos;ll count the kit for you.
            </span>
          </span>
          <ArrowRight aria-hidden className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}
