import { Breadcrumbs, DemoNote } from "@/components/ui/primitives";

/** Shared layout for editorial/legal content pages. */
export function ContentPage({
  eyebrow,
  title,
  intro,
  draft,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  draft?: boolean;
  children: React.ReactNode;
}) {
  const label = typeof title === "string" ? title : (eyebrow ?? "Page");
  return (
    <div className="container-luxe pb-28 pt-8 sm:pt-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label }]} />
      <header className="max-w-3xl pb-12 pt-10">
        {eyebrow && <p className="eyebrow text-accent-ink">{eyebrow}</p>}
        <h1 className="mt-4 text-h1">{title}</h1>
        {intro && <div className="mt-6 text-[1.08rem] leading-relaxed text-muted">{intro}</div>}
        {draft && (
          <DemoNote className="mt-8 max-w-xl">
            Draft policy for development. Every detail marked “to be confirmed” must be finalised by Events Emporio (and reviewed for
            compliance with Indian consumer-protection and data-protection rules) before launch.
          </DemoNote>
        )}
      </header>
      {children}
    </div>
  );
}

/** Long-form typography for policy text. */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-3xl space-y-5 text-[1rem] leading-[1.8] text-muted [&_h2]:mt-12 [&_h2]:font-serif [&_h2]:text-[1.9rem] [&_h2]:leading-tight [&_h2]:text-ink [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
      {children}
    </div>
  );
}

export function Tbc({ children }: { children: React.ReactNode }) {
  return <mark className="rounded-[4px] bg-accent-soft/70 px-1 text-ink">[{children} — to be confirmed]</mark>;
}
