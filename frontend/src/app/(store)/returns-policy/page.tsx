import type { Metadata } from "next";
import { ContentPage, Prose, Tbc } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "Returns & Refunds", alternates: { canonical: "/returns-policy" } };

export default function ReturnsPolicyPage() {
  return (
    <ContentPage eyebrow="Policies" title="Returns & Refunds" draft>
      <Prose>
        <h2>Eligibility</h2>
        <p>
          Return eligibility: <Tbc>which products can be returned, and within how many days</Tbc>. Perishable items (such as chocolates,
          macarons and dry fruits) and personalised or custom-made pieces are typically not returnable unless they arrive damaged or
          incorrect — <Tbc>final list</Tbc>.
        </p>
        <h2>Damaged or incorrect items</h2>
        <p>
          If something arrives damaged or isn&apos;t what you ordered, contact us within <Tbc>reporting window</Tbc> with your order number
          and photographs. We&apos;ll arrange a replacement or refund.
        </p>
        <h2>Cancellations</h2>
        <p>
          Orders can be cancelled before they move into processing. Custom orders can be cancelled{" "}
          <Tbc>custom-order cancellation terms</Tbc>.
        </p>
        <h2>Refunds</h2>
        <p>
          Approved refunds are issued to the original payment method through Razorpay. Banks typically take <Tbc>refund timeline</Tbc> to
          reflect the amount.
        </p>
      </Prose>
    </ContentPage>
  );
}
