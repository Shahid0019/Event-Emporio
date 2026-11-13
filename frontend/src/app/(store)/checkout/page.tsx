import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Breadcrumbs } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="container-luxe pb-28 pt-2 sm:pt-12">
      <Breadcrumbs items={[{ label: "Bag", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="mb-8 mt-3 text-h1 leading-tight sm:mb-12 sm:mt-6">Delivery &amp; payment</h1>
      <CheckoutForm />
    </div>
  );
}
