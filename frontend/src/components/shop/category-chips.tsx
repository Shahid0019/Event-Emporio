import Image from "next/image";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { getCategories } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Phones (handbook screen 02, "Browse by category"): a swipeable row of
 * category pictures under the search, with the current one highlighted.
 */
export async function CategoryChips({ active }: { active?: string }) {
  const categories = await getCategories();
  const chip = (on: boolean) =>
    cn(
      "flex w-[4.75rem] shrink-0 snap-start flex-col items-center gap-1.5 rounded-control p-1 text-center active:opacity-80",
      on && "bg-surface ring-1 ring-brand",
    );
  return (
    <nav aria-label="Browse by category" className="-mx-[var(--gutter)] mt-4 md:hidden">
      <ul className="scrollbar-none flex snap-x gap-2 overflow-x-auto px-[var(--gutter)] pb-1">
        <li>
          <Link href="/shop" aria-current={!active ? "page" : undefined} className={chip(!active)}>
            <span className="grid aspect-square w-full place-items-center rounded-chip bg-surface">
              <LayoutGrid aria-hidden className="size-6 text-accent-ink" />
            </span>
            <span className="text-[0.72rem] font-medium leading-tight">All</span>
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/category/${c.slug}`} aria-current={active === c.slug ? "page" : undefined} className={chip(active === c.slug)}>
              <span className="relative block aspect-square w-full overflow-hidden rounded-chip bg-surface">
                <Image src={c.image.src} alt="" fill sizes="76px" className="object-cover" />
              </span>
              <span className="line-clamp-2 text-[0.72rem] font-medium leading-tight">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
