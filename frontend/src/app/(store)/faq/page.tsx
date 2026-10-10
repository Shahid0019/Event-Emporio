import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/layout/content-page";
import { Accordion } from "@/components/ui/accordion";
import { faqs } from "@/lib/data/content";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about orders, custom requests, delivery and payments at Events Emporio.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.flatMap((g) =>
      g.items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
    ),
  };
  return (
    <ContentPage eyebrow="Help" title="Frequently asked questions">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />
      <div className="grid gap-14 lg:grid-cols-12">
        <div className="space-y-14 lg:col-span-8">
          {faqs.map((group) => (
            <section key={group.group} aria-labelledby={`faq-${group.group}`}>
              <h2 id={`faq-${group.group}`} className="mb-4 font-serif text-3xl">
                {group.group}
              </h2>
              <Accordion items={group.items.map((item, i) => ({ id: `${group.group}-${i}`, title: item.q, content: <p>{item.a}</p> }))} />
            </section>
          ))}
        </div>
        <aside className="lg:col-span-3 lg:col-start-10">
          <div className="rounded-card bg-surface p-7">
            <h2 className="font-serif text-2xl">Still have a question?</h2>
            <p className="mt-3 text-[0.92rem] text-muted">We&apos;re happy to help.</p>
            <Link href="/contact" className="mt-6 inline-block text-[0.72rem] font-medium uppercase tracking-[0.16em] link-underline">
              Contact us
            </Link>
          </div>
        </aside>
      </div>
    </ContentPage>
  );
}
