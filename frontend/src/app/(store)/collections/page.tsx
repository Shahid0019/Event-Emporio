import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Breadcrumbs } from "@/components/ui/primitives";
import { getCollections, productCountFor } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Collections",
  description: "Curated edits for the mehndi night, the bride, thoughtful gifting and the celebration table.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const collections = await getCollections();
  return (
    <div className="container-luxe pb-28">
      <header className="pb-14 pt-8 sm:pt-12">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Collections" }]} />
        <p className="eyebrow mt-8 text-accent-ink">Curated edits</p>
        <h1 className="mt-4 max-w-3xl text-h1">
          Collections for every <em className="text-brand">chapter</em> of the celebration
        </h1>
      </header>

      <Reveal stagger={0.1} className="grid gap-x-8 gap-y-20 md:grid-cols-2">
        {collections.map((c, i) => (
          <Link key={c.slug} href={`/collections/${c.slug}`} data-reveal className={cn("group block", i % 2 === 1 && "md:mt-28")}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-media bg-surface">
              <Image
                src={c.image.src}
                alt={c.image.alt}
                fill
                preload={i < 2}
                sizes="(min-width: 768px) 46vw, 100vw"
                className="object-cover transition-transform duration-[1.6s] ease-[var(--ease-luxe)] group-hover:scale-105"
              />
            </div>
            <div className="mt-6 flex items-end justify-between gap-6">
              <div>
                <p className="eyebrow text-accent-ink">{c.tagline}</p>
                <h2 className="mt-3 text-h3 group-hover:text-brand">{c.name}</h2>
                <p className="mt-2 text-[0.9rem] text-muted">{productCountFor({ collection: c.slug })} pieces</p>
              </div>
              <ArrowRight className="mb-2 size-5 shrink-0 transition-transform duration-500 group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </Reveal>
    </div>
  );
}
