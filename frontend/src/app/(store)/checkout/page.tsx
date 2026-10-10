import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Breadcrumbs } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="container-luxe pb-28 pt-8 sm:pt-12">
      <Breadcrumbs items={[{ label: "Bag", href: "/cart" }, { label: "Checkout" }]} />
      <h1 className="mb-12 mt-6 text-h1">Checkout</h1>
      <CheckoutForm />
    </div>
  );
}
