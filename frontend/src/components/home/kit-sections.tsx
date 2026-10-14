import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge, SectionHeading } from "@/components/ui/primitives";
import { demoImage, type DemoImageName } from "@/lib/data/images";
import { activeLines, buildKit, kitTotal, NO_PREFS } from "@/lib/kit/buildKit";
import { GUESTS_PER_TRAMI, kitItemById, occasions, readyKits, type Occasion } from "@/lib/kit/config";
import { formatKitAmount } from "@/lib/kit/format";
import { kitImage } from "@/lib/kit/products";
import { occasionName, tierName } from "@/lib/kit/url";

/** DEMO imagery — placeholder photos until the shop's own function photos arrive. */
const occasionImages: Record<Occasion, [DemoImageName, string]> = {
  wazwan: ["dinner-table", "Long dinner table set for a feast"],
  nikkah: ["mehndi-rings", "Hennaed hands with wedding rings"],
  mehndi: ["mehndi-hands", "Hands decorated with intricate henna"],
  walima: ["candlelit-table", "Candlelit reception table"],
};

/** "Kis function ke liye?" — each card opens the kit builder with the occasion answered. */
export function OccasionCards() {
  return (
    <section aria-labelledby="occasions-title" className="pb-[clamp(4rem,2.5rem+6vw,9rem)]">
      <div className="container-luxe">
        <SectionHeading
          eyebrow="Build my kit"
          title={
            <span id="occasions-title">
              Kis <em className="text-brand">function</em> ke liye?
            </span>
          }
          description="Pick the function and tell us how many trami. We count every dastarkhan, glass, box and bag for you."
        />
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {occasions.map((o) => {
            const [name, alt] = occasionImages[o.id];
            const image = demoImage(name, alt);
            return (
              <li key={o.id}>
                <Link
                  href={`/kit?occasion=${o.id}`}
                  className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-media bg-surface p-4 text-canvas sm:p-6"
                >
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(min-width: 1024px) 23vw, 50vw"
                    className="-z-10 object-cover transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-105"
                  />
                  <span aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-ink/30 to-ink/0" />
                  <span className="font-serif text-[1.6rem] leading-tight sm:text-[2rem]">{o.name}</span>
                  <span className="mt-1 text-[0.85rem] text-canvas/90">{o.adds ?? o.description}</span>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-[0.16em]">
                    Build kit <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** Three ready-made Wazwan kits, priced live from the kit config. */
export function ReadyKits() {
  return (
    <section aria-labelledby="ready-kits-title" className="pb-[clamp(4rem,2.5rem+6vw,9rem)]">
      <div className="container-luxe">
        <SectionHeading
          eyebrow="Ready kits"
          title={
            <span id="ready-kits-title">
              Tayyar <em className="text-brand">kits</em>
            </span>
          }
          description="Complete Wazwan kits, counted per trami. Open one and change anything you like."
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
          {readyKits.map((r) => {
            const lines = buildKit({ occasion: r.occasion, trami: r.trami, tier: r.tier, prefs: NO_PREFS });
            const total = kitTotal(lines);
            return (
              <li key={r.id} className="flex flex-col rounded-card border border-line bg-raised p-6">
                <Badge tone={r.id === "50-standard" ? "brand" : "accent"} className="self-start">
                  {r.badge}
                </Badge>
                <h3 className="mt-5 text-h3">
                  {r.trami} trami · {tierName(r.tier)}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {occasionName(r.occasion)} · ≈ {r.trami * GUESTS_PER_TRAMI} mehmaan · {activeLines(lines).length} items
                </p>
                <ThumbStack ids={activeLines(lines).map((l) => l.itemId)} />
                <p className="mt-5 text-2xl font-medium tabular-nums">{formatKitAmount(total)}</p>
                <p className="text-sm tabular-nums text-muted">{formatKitAmount(total / r.trami)} per trami</p>
                <Link
                  href={`/kit?ready=${r.id}`}
                  className={buttonVariants({ variant: r.id === "50-standard" ? "primary" : "outline", className: "mt-6 w-full" })}
                  aria-label={`Open kit: ${r.trami} trami ${tierName(r.tier)}`}
                >
                  Open kit
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** A few overlapping item illustrations with a "+N" count. */
function ThumbStack({ ids, show = 5 }: { ids: string[]; show?: number }) {
  return (
    <div aria-hidden className="mt-6 flex -space-x-2.5">
      {ids.slice(0, show).map((id) => {
        const item = kitItemById(id);
        if (!item) return null;
        const image = kitImage(item);
        return (
          <span key={id} className="relative size-11 overflow-hidden rounded-full border-2 border-raised bg-surface">
            <Image src={image.src} alt="" fill sizes="44px" className="scale-[1.12] object-cover" />
          </span>
        );
      })}
      {ids.length > show && (
        <span className="grid size-11 place-items-center rounded-full border-2 border-raised bg-surface text-[0.75rem] font-medium">
          +{ids.length - show}
        </span>
      )}
    </div>
  );
}
