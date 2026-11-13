import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/ui/primitives";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Bento layout for six categories — each slot gets its own proportion rather than identical cards.
 * Desktop (12 columns, 3 rows): a large tile with two small and one wide beside it, then two wide tiles.
 * Tablets (2 columns): the first and last tiles run full width, the rest in pairs.
 */
const slots = [
  { cell: "col-span-2 lg:col-span-6 lg:row-span-2", sizes: "(min-width: 1024px) 48vw, 100vw", title: "text-[2rem] sm:text-[2.6rem]" },
  { cell: "lg:col-span-3", sizes: "(min-width: 1024px) 24vw, 50vw", title: "text-[1.2rem] sm:text-[1.7rem]" },
  { cell: "lg:col-span-3", sizes: "(min-width: 1024px) 24vw, 50vw", title: "text-[1.2rem] sm:text-[1.7rem]" },
  { cell: "lg:col-span-6", sizes: "(min-width: 1024px) 48vw, 50vw", title: "text-[1.2rem] sm:text-[1.9rem]" },
  { cell: "lg:col-span-5", sizes: "(min-width: 1024px) 40vw, 50vw", title: "text-[1.2rem] sm:text-[1.9rem]" },
  { cell: "col-span-2 lg:col-span-7", sizes: "(min-width: 1024px) 56vw, 100vw", title: "text-[1.2rem] sm:text-[1.9rem]" },
];

export function CategoryGrid({ categories }: { categories: Category[] }) {
  const shown = categories.slice(0, slots.length);
  return (
    <section aria-labelledby="categories-title" className="section-y">
      <div className="container-luxe">
        <SectionHeading title={<span id="categories-title">Browse By Category</span>} />

        {/* Phones: compact tiles, three across, picture above the name. */}
        <ul className="mt-8 grid grid-cols-3 gap-2.5 md:hidden">
          {shown.map((category) => (
            <li key={category.slug}>
              <Link href={`/category/${category.slug}`} className="block h-full overflow-hidden rounded-card bg-surface active:opacity-80">
                <span className="relative block aspect-square">
                  <Image src={category.image.src} alt="" fill sizes="33vw" className="object-cover" />
                </span>
                <span className="flex min-h-11 items-center justify-center px-1.5 py-2 text-center text-[0.8rem] font-medium leading-tight">
                  {category.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Reveal
          stagger={0.08}
          className="mt-12 hidden auto-rows-[clamp(14rem,40vw,20rem)] grid-cols-2 gap-3 sm:gap-5 md:grid lg:mt-16 lg:grid-cols-12 lg:auto-rows-[clamp(13rem,19vw,19rem)]"
        >
          {shown.map((category, i) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              data-reveal
              className={cn("group relative isolate block overflow-hidden rounded-media bg-surface", slots[i].cell)}
            >
              <Image
                src={category.image.src}
                alt={category.image.alt}
                fill
                sizes={slots[i].sizes}
                className="object-cover transition-transform duration-[1.6s] ease-[var(--ease-luxe)] group-hover:scale-[1.05]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
              <span className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-canvas sm:inset-x-6 sm:bottom-6">
                <span>
                  <span className="eyebrow hidden text-canvas/75 sm:block">{String(i + 1).padStart(2, "0")}</span>
                  <span className={cn("mt-1 block font-serif leading-[1.05]", slots[i].title)}>{category.name}</span>
                </span>
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-canvas/50 transition-[background-color,color] duration-500 group-hover:bg-canvas group-hover:text-ink">
                  <ArrowUpRight className="size-4" />
                </span>
              </span>
            </Link>
          ))}
        </Reveal>

        <div className="mt-8 text-center lg:mt-12">
          <Link href="/shop" className="link-underline text-[0.72rem] font-medium uppercase tracking-[0.16em]">
            View all products
          </Link>
        </div>
      </div>
    </section>
  );
}
