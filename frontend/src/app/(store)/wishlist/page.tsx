import type { Metadata } from "next";
import { WishlistView } from "@/components/product/wishlist-view";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return (
    <div className="container-luxe pb-28 pt-10 sm:pt-14">
      <p className="eyebrow text-accent-ink">Saved for later</p>
      <h1 className="mt-4 text-h1">
        Your <em className="text-brand">wishlist</em>
      </h1>
      <WishlistView />
    </div>
  );
}
