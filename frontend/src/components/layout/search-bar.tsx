"use client";

import { Search } from "lucide-react";
import { setSearchOpen } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Phones: a full-width search field, as in a shopping app. Tapping it opens
 * the search sheet (same as the header's search button), so typing happens
 * with suggestions right there. Hidden from md up, where the header carries search.
 */
export function SearchBar({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => setSearchOpen(true)}
      className={cn(
        "flex h-12 w-full items-center gap-3 rounded-control border border-line-strong bg-raised px-4 text-left text-md text-muted shadow-[0_6px_20px_-14px_rgb(34_41_35/0.35)] transition-colors active:bg-surface md:hidden",
        className,
      )}
    >
      <Search aria-hidden className="size-[1.15rem] shrink-0 text-ink" />
      <span className="truncate">Search plates, glasses, hampers…</span>
    </button>
  );
}
