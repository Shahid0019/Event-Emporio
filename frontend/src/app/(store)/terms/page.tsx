import type { Metadata } from "next";
import { ContentPage, Prose, Tbc } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "Terms & Conditions", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <ContentPage eyebrow="Policies" title="Terms & Conditions" draft>
      <Prose>
        <p>
          These terms govern purchases from Events Emporio (<Tbc>registered business name, GSTIN and address</Tbc>). By placing an order you
          agree to them.
        </p>
        <h2>Products & pricing</h2>
        <p>
          Prices are listed in Indian Rupees and include applicable taxes. Handmade and floral pieces may vary slightly from photographs. If
          a pricing error occurs, we&apos;ll contact you before processing the order.
        </p>
        <h2>Orders</h2>
        <p>An order is confirmed once payment is verified. We may cancel and refund an order if an item becomes unavailable.</p>
        <h2>Custom orders</h2>
        <p>
          Custom and bulk orders are governed by the quote you approve, including timelines and any advance payment:{" "}
          <Tbc>advance terms</Tbc>.
        </p>
        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of India. Jurisdiction: <Tbc>courts</Tbc>.
        </p>
      </Prose>
    </ContentPage>
  );
}
