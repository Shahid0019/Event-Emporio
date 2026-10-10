"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ProductSummary } from "@/lib/catalog";
import { ProductCard } from "./product-card";

/** Horizontally scrolling, snap-aligned product row with keyboard-accessible arrows. */
export function ProductRail({ products, label }: { products: ProductSummary[]; label: string }) {
  const ref = useRef<HTMLUListElement>(null);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="relative">
      <div className="mb-6 hidden justify-end gap-2 md:flex">
        <RailButton label={`Scroll ${label} left`} onClick={() => scroll(-1)}>
          <ArrowLeft className="size-4" />
        </RailButton>
        <RailButton label={`Scroll ${label} right`} onClick={() => scroll(1)}>
          <ArrowRight className="size-4" />
        </RailButton>
      </div>
      <ul
        ref={ref}
        aria-label={label}
        className="scrollbar-none -mx-[var(--gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-[var(--gutter)] px-[var(--gutter)] pb-2 sm:gap-6"
      >
        {products.map((p) => (
          <li key={p.id} className="w-[68%] shrink-0 snap-start min-[480px]:w-[44%] md:w-[31%] xl:w-[23.5%]">
            <ProductCard product={p} sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 66vw" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RailButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink hover:bg-ink hover:text-canvas"
    >
      {children}
    </button>
  );
}
