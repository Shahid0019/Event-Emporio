"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Check, EyeOff, MessageSquareText, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { adminStore, updateAdmin } from "@/lib/store/admin-store";
import type { ProductReview, ProductReviewStatus } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { AdminHeader, ConfirmAction } from "./admin-ui";

type Filter = ProductReviewStatus | "all";

const statusInfo: Record<ProductReviewStatus, { label: string; tone: "accent" | "success" | "muted" }> = {
  pending: { label: "Awaiting approval", tone: "accent" },
  approved: { label: "Published", tone: "success" },
  hidden: { label: "Hidden", tone: "muted" },
};

/** Customers' reviews from product pages: approve them to publish, hide or delete the rest. */
export function ProductReviewsAdmin() {
  const { productReviews } = adminStore.useStore();
  const pending = productReviews.filter((r) => r.status === "pending").length;
  const [filter, setFilter] = useState<Filter>(pending ? "pending" : "all");
  const shown = productReviews.filter((r) => filter === "all" || r.status === filter);

  const setStatus = async (review: ProductReview, status: ProductReviewStatus) => {
    const saved = await updateAdmin((d) => {
      const r = d.productReviews.find((x) => x.id === review.id);
      if (r) r.status = status;
    });
    if (saved) toast.success(status === "approved" ? "Review published" : "Review hidden from the shop");
  };

  const tabs: { value: Filter; label: string; count: number }[] = [
    { value: "pending", label: "Awaiting approval", count: pending },
    { value: "approved", label: "Published", count: productReviews.filter((r) => r.status === "approved").length },
    { value: "hidden", label: "Hidden", count: productReviews.filter((r) => r.status === "hidden").length },
    { value: "all", label: "All", count: productReviews.length },
  ];

  return (
    <>
      <AdminHeader
        title="Product reviews"
        description="Written by signed-in customers on product pages. Nothing shows in the shop until you publish it."
      />

      <div className="mb-5 flex flex-wrap gap-1.5" role="group" aria-label="Filter reviews">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={filter === t.value}
            onClick={() => setFilter(t.value)}
            className={cn(
              "h-9 rounded-full border px-3.5 text-[0.8rem] transition-colors",
              filter === t.value ? "border-ink bg-ink text-canvas" : "border-line-strong hover:border-ink",
            )}
          >
            {t.label} <span className="opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText className="size-6 stroke-[1.25]" />}
          title={filter === "pending" ? "Nothing waiting for approval" : "No reviews here yet"}
          description="When customers review a product, it lands here for you to check before it goes live."
        />
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {shown.map((r) => (
            <li key={r.id} className="flex flex-col rounded-card border border-line bg-raised p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className="inline-flex gap-0.5 text-accent-ink" aria-label={`Rated ${r.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} aria-hidden className={cn("size-4", n <= r.rating ? "fill-current" : "text-line-strong")} />
                  ))}
                </span>
                <Badge tone={statusInfo[r.status].tone}>{statusInfo[r.status].label}</Badge>
              </div>
              {r.title && <p className="mt-3 font-medium">{r.title}</p>}
              <p className={cn("whitespace-pre-line text-[0.92rem] leading-relaxed", r.title ? "mt-1" : "mt-3")}>{r.text}</p>
              <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] text-muted">
                <span className="text-ink">{r.displayName}</span>
                {r.verifiedPurchase && (
                  <span className="inline-flex items-center gap-1 text-success">
                    <BadgeCheck className="size-3.5" /> Verified purchase
                  </span>
                )}
                <span>{formatDateTime(r.updatedAt)}</span>
              </p>
              <Link
                href={`/products/${r.productSlug}#reviews`}
                target="_blank"
                className="mb-5 mt-1 truncate text-[0.8rem] text-muted underline underline-offset-4 hover:text-ink"
              >
                {r.productName}
              </Link>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-4">
                {r.status !== "approved" && (
                  <Button size="sm" onClick={() => void setStatus(r, "approved")}>
                    <Check /> Publish
                  </Button>
                )}
                {r.status !== "hidden" && (
                  <Button size="sm" variant="outline" onClick={() => void setStatus(r, "hidden")}>
                    <EyeOff /> Hide
                  </Button>
                )}
                <ConfirmAction
                  trigger={
                    <Button size="sm" variant="ghost" className="ml-auto text-danger">
                      <Trash2 /> Delete
                    </Button>
                  }
                  title="Delete this review?"
                  description="It's removed for good, and the customer can write a new one. To take it down for now, hide it instead."
                  confirmLabel="Delete"
                  destructive
                  onConfirm={async () => {
                    if (await updateAdmin((d) => void (d.productReviews = d.productReviews.filter((x) => x.id !== r.id))))
                      toast("Review deleted");
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
