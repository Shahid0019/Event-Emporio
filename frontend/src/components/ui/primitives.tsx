import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn, discountPercent, formatPrice } from "@/lib/utils";

/* ------------------------------- Logo -------------------------------- */
/**
 * Typographic wordmark used until the client supplies the official logo.
 * Swap the inner markup for <Image src="/logo.svg" …/> once available.
 */
export function Logo({ className, tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  return (
    <Link
      href="/"
      aria-label="Events Emporio — home"
      className={cn("group inline-flex flex-col leading-none", tone === "light" ? "text-canvas" : "text-ink", className)}
    >
      <span className="font-serif text-[1.55rem] font-medium tracking-[0.01em] sm:text-[1.7rem]">
        Events <em className={cn("font-normal italic", tone === "light" ? "text-accent-soft" : "text-brand")}>Emporio</em>
      </span>
    </Link>
  );
}

/* ------------------------------- Price ------------------------------- */
export function Price({
  price,
  compareAtPrice,
  from,
  className,
  size = "md",
}: {
  price: number;
  compareAtPrice?: number;
  from?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const pct = discountPercent(price, compareAtPrice);
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2.5 gap-y-1", className)}>
      {from && <span className="text-[0.8em] text-muted">From</span>}
      <span className={cn("font-medium text-ink", size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-[0.95rem]")}>
        <span className="sr-only">{pct ? "Sale price " : "Price "}</span>
        {formatPrice(price)}
      </span>
      {pct && compareAtPrice && (
        <>
          <s className={cn("text-muted", size === "lg" ? "text-base" : "text-[0.85rem]")}>
            <span className="sr-only">Original price </span>
            {formatPrice(compareAtPrice)}
          </s>
          <span className="text-[0.78rem] font-medium text-brand">{pct}% off</span>
        </>
      )}
    </p>
  );
}

/* -------------------------- Section heading -------------------------- */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        align === "center" && "items-center text-center md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {eyebrow && <p className="eyebrow mb-4 text-accent-ink">{eyebrow}</p>}
        <Tag className={Tag === "h1" ? "text-h1" : "text-h2"}>{title}</Tag>
        {description && <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ----------------------------- Breadcrumbs --------------------------- */
export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[0.78rem] text-muted">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight aria-hidden className="size-3 text-line-strong" />}
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="transition-colors hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ----------------------------- Empty state --------------------------- */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center", className)}>
      {icon && <div className="mb-6 grid size-16 place-items-center rounded-full border border-line text-accent-ink">{icon}</div>}
      <h2 className="text-h3">{title}</h2>
      {description && <p className="mt-3 leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

/* ------------------------------ Skeleton ----------------------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-control bg-surface", className)} />;
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading products" className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <Skeleton className="aspect-[4/5] w-full rounded-card" />
          <Skeleton className="mt-4 h-3 w-1/3" />
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/4" />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- Badge ------------------------------ */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "danger" | "accent" | "muted";
  className?: string;
}) {
  const tones = {
    neutral: "bg-canvas text-ink",
    brand: "bg-brand text-brand-ink",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    accent: "bg-accent-soft text-ink",
    muted: "bg-surface text-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.66rem] font-medium uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------ Demo note ---------------------------- */
export function DemoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[0.75rem] leading-relaxed text-muted", className)}>
      <span className="mr-1.5 inline-block rounded-full border border-line-strong px-2 py-px text-[0.6rem] font-medium uppercase tracking-[0.16em]">
        Demo
      </span>
      {children}
    </p>
  );
}
