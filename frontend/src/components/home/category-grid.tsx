import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/ui/primitives";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Editorial, asymmetric layout — each slot gets its own proportion rather than identical cards. */
const slots = [
  { cell: "col-span-2 lg:col-span-5 lg:row-span-2", sizes: "(min-width: 1024px) 40vw, 100vw", title: "text-[2rem] sm:text-[2.6rem]" },
  { cell: "lg:col-span-4", sizes: "(min-width: 1024px) 32vw, 50vw", title: "text-[1.2rem] sm:text-[1.9rem]" },
  { cell: "lg:col-span-3", sizes: "(min-width: 1024px) 24vw, 50vw", title: "text-[1.2rem] sm:text-[1.9rem]" },
  { cell: "lg:col-span-3", sizes: "(min-width: 1024px) 24vw, 50vw", title: "text-[1.2rem] sm:text-[1.9rem]" },
  { cell: "lg:col-span-4", sizes: "(min-width: 1024px) 32vw, 50vw", title: "text-[1.2rem] sm:text-[1.9rem]" },
];

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <section aria-labelledby="categories-title" className="section-y">
      <div className="container-luxe">
        <SectionHeading
          eyebrow="Shop by category"
          title={
            <span id="categories-title">
              For every <em className="text-brand">ritual</em> & reason
            </span>
          }
          action={
            <Link href="/shop" className="link-underline text-[0.72rem] font-medium uppercase tracking-[0.16em]">
              View all products
            </Link>
          }
        />

        <Reveal
          stagger={0.08}
          className="mt-12 grid grid-cols-2 gap-3 auto-rows-[clamp(14rem,62vw,22rem)] sm:gap-5 lg:mt-16 lg:grid-cols-12 lg:auto-rows-[clamp(16rem,23vw,22rem)]"
        >
          {categories.slice(0, slots.length).map((category, i) => (
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
      </div>
    </section>
  );
}
