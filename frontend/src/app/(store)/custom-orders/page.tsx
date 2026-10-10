import type { Metadata } from "next";
import { CustomOrderForm } from "@/components/forms/enquiry-forms";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Custom & Bulk Orders",
  description: "Request personalised hampers, favours and bulk quantities for weddings, mehndi, corporate and festive occasions.",
  alternates: { canonical: "/custom-orders" },
};

const steps = [
  { title: "Share your brief", body: "Occasion, date, quantities and the feel you're after." },
  { title: "We propose options", body: "Contents, packaging and personalisation ideas within your budget." },
  { title: "Confirm & we create", body: "Once you approve the quote, we prepare everything to order." },
];

export default function CustomOrdersPage() {
  return (
    <ContentPage
      eyebrow="Bespoke"
      title={
        <>
          Custom & <em className="text-brand">bulk</em> orders
        </>
      }
      intro="Personalised hampers, favours for every guest, corporate gifting — tell us what you have in mind. Custom work is quoted individually rather than priced at checkout."
    >
      <ol className="mb-16 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="bg-canvas px-6 py-6 sm:px-8">
            <span className="font-serif text-xl italic text-accent-ink">0{i + 1}</span>
            <h2 className="mt-2 font-serif text-2xl">{s.title}</h2>
            <p className="mt-2 text-[0.92rem] text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
      <div className="max-w-3xl">
        <CustomOrderForm />
      </div>
    </ContentPage>
  );
}
