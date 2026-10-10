import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = {
  title: "Your Bag",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="container-luxe pb-28 pt-10 sm:pt-14">
      <h1 className="text-h1">
        Your <em className="text-brand">bag</em>
      </h1>
      <CartView />
    </div>
  );
}
