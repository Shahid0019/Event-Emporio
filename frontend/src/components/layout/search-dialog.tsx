"use client";

import Image from "next/image";
import Link from "next/link";
import Form from "next/form";
import { useEffect, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import type { SearchSuggestions } from "@/lib/catalog";
import { setSearchOpen, uiStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";

const popular = ["Mehndi basket", "Bridal hamper", "Macarons", "Brass tray", "Gift box"];

export function SearchDialog() {
  const open = uiStore.useStore((s) => s.searchOpen);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchSuggestions | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounced suggestions from the server — the catalogue never ships to the browser.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) setResults((await res.json()) as SearchSuggestions);
      } catch {
        /* aborted or offline — keep previous suggestions */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  const close = () => setSearchOpen(false);
  const showResults = query.trim().length >= 2 && results;
  const empty = showResults && !results.products.length && !results.categories.length;

  return (
    <Sheet open={open} onOpenChange={setSearchOpen} title="Search" side="top" hideTitle bodyClassName="p-0">
      <div className="container-luxe py-6 sm:py-10">
        <Form action="/search" onSubmit={close} role="search" className="relative">
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <Search aria-hidden className="absolute left-0 top-1/2 size-6 -translate-y-1/2 stroke-[1.25] text-muted" />
          <input
            id="site-search"
            name="q"
            type="search"
            autoComplete="off"
            data-autofocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length < 2) setResults(null);
            }}
            placeholder="Search baskets, hampers, gifts…"
            className="h-16 w-full border-b border-line-strong bg-transparent pl-10 pr-24 font-serif text-[1.6rem] text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none sm:text-[2.2rem]"
          />
          <button
            type="submit"
            className="absolute right-0 top-1/2 -translate-y-1/2 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-ink"
          >
            Search
          </button>
        </Form>

        <div className="mt-8 min-h-28" aria-live="polite" aria-busy={loading}>
          {!showResults && (
            <div>
              <p className="eyebrow mb-4 text-accent-ink">Popular searches</p>
              <ul className="flex flex-wrap gap-2">
                {popular.map((term) => (
                  <li key={term}>
                    <Link
                      href={`/search?q=${encodeURIComponent(term)}`}
                      onClick={close}
                      className="inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-sm transition-colors hover:border-ink"
                    >
                      {term}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {empty && (
            <p className="text-muted">
              Nothing matches “{query.trim()}”. Try a broader word like <em>hamper</em> or <em>basket</em>.
            </p>
          )}

          {showResults && !empty && (
            <div className="grid gap-10 md:grid-cols-[1fr_16rem]">
              <div>
                <p className="eyebrow mb-4 text-accent-ink">Products</p>
                <ul className="divide-y divide-line">
                  {results.products.map((p) => (
                    <li key={p.slug}>
                      <Link href={`/products/${p.slug}`} onClick={close} className="group flex items-center gap-4 py-3">
                        <span className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-chip bg-surface">
                          <Image src={p.image.src} alt="" fill sizes="56px" className="object-cover" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-serif text-xl group-hover:text-brand">{p.name}</span>
                          <span className="text-[0.8rem] text-muted">{p.categoryName}</span>
                        </span>
                        <span className="text-sm">{formatPrice(p.price)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={close}
                  className="mt-5 inline-flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.16em] link-underline"
                >
                  See all results <ArrowRight className="size-3.5" />
                </Link>
              </div>
              {results.categories.length > 0 && (
                <div>
                  <p className="eyebrow mb-4 text-accent-ink">Categories</p>
                  <ul className="space-y-3">
                    {results.categories.map((c) => (
                      <li key={c.slug}>
                        <Link href={`/category/${c.slug}`} onClick={close} className="font-serif text-xl hover:text-brand">
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  );
}
