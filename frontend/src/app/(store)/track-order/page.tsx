import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/forms/enquiry-forms";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Track Your Order",
  robots: { index: false, follow: true },
};

export default function TrackOrderPage() {
  return (
    <ContentPage
      eyebrow="Order tracking"
      title={
        <>
          Where&apos;s my <em className="text-brand">order?</em>
        </>
      }
      intro="Enter your order number and the email address you used at checkout."
    >
      <div className="max-w-4xl">
        <TrackOrderForm />
      </div>
    </ContentPage>
  );
}
