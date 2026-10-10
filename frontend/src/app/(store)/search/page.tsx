import type { Metadata } from "next";
import Form from "next/form";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { CatalogResults, CatalogSkeleton } from "@/components/shop/catalog";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="container-luxe pb-24">
      <header className="pb-10 pt-10 sm:pt-14">
        <p className="eyebrow text-accent-ink">Search</p>
        <Suspense fallback={<SearchForm />}>
          <SearchHeading searchParams={searchParams} />
        </Suspense>
      </header>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogResults searchParams={searchParams} basePath="/search" />
      </Suspense>
    </div>
  );
}

async function SearchHeading({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const raw = await searchParams;
  const q = (Array.isArray(raw.q) ? raw.q[0] : raw.q)?.slice(0, 80) ?? "";
  return <SearchForm defaultValue={q} />;
}

function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <Form action="/search" role="search" className="relative mt-5 max-w-3xl">
      <label htmlFor="search-page-q" className="sr-only">
        Search products
      </label>
      <Search aria-hidden className="absolute left-0 top-1/2 size-6 -translate-y-1/2 stroke-[1.25] text-muted" />
      <input
        id="search-page-q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        key={defaultValue}
        placeholder="What are you looking for?"
        className="h-16 w-full border-b border-line-strong bg-transparent pl-10 font-serif text-[1.8rem] placeholder:text-muted/60 focus:border-ink focus:outline-none sm:text-[2.6rem]"
      />
    </Form>
  );
}
