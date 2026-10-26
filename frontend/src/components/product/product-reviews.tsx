"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, PenLine, Star } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/primitives";
import { sessionStore } from "@/lib/store";
import type { ProductReview } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

/** A review as the product page lists it: customers' approved reviews and the shop's own testimonials. */
export interface ShownReview {
  id: string;
  displayName: string;
  rating?: number;
  title?: string;
  text: string;
  verifiedPurchase?: boolean;
  date?: string;
}

const TEXT_MAX = 1500;
const ratingWords = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex gap-0.5 text-accent-ink", className)} aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={cn("size-4", n <= Math.round(rating) ? "fill-current" : "text-line-strong")} />
      ))}
    </span>
  );
}

export function ProductReviews({ productId, productSlug, reviews }: { productId: string; productSlug: string; reviews: ShownReview[] }) {
  const user = sessionStore.useStore();
  const [mine, setMine] = useState<ProductReview | null>(null);
  const [writing, setWriting] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const rated = reviews.filter((r) => r.rating);
  const average = rated.length ? rated.reduce((s, r) => s + r.rating!, 0) / rated.length : 0;
  const reviewHref = `/products/${productSlug}?review=1#reviews`;
  const loginHref = `/login?next=${encodeURIComponent(reviewHref)}`;

  // Signed in: fetch their own review (any status). Back from signing in with ?review=1: open the form.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ review: ProductReview | null }>) : null))
      .then((data) => {
        if (cancelled) return;
        if (data) setMine(data.review);
        const params = new URLSearchParams(window.location.search);
        if (params.get("review") === "1") {
          setWriting(true);
          sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          params.delete("review");
          const query = params.toString();
          window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}#reviews`);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, productId]);

  const others = reviews.filter((r) => r.id !== mine?.id);
  const writeButton = !user ? (
    <Link href={loginHref} className={buttonVariants({ variant: "secondary", size: "sm", className: "h-10 px-5" })}>
      <PenLine /> Write a review
    </Link>
  ) : (
    !writing && (
      <Button variant="secondary" size="sm" className="h-10 px-5" onClick={() => setWriting(true)}>
        <PenLine /> {mine ? "Edit your review" : "Write a review"}
      </Button>
    )
  );

  return (
    <section ref={sectionRef} id="reviews" aria-labelledby="reviews-title" className="scroll-mt-24 border-t border-line">
      <div className="container-luxe py-16 sm:py-20">
        {/* Heading, the score at a glance, and the one action */}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h2 id="reviews-title" className="text-h2">
              Reviews
            </h2>
            {rated.length > 0 ? (
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9rem] text-muted">
                <Stars rating={average} />
                <span>
                  <span className="font-medium text-ink tabular-nums">{average.toFixed(1)}</span> out of 5 · {rated.length} review
                  {rated.length > 1 ? "s" : ""}
                </span>
              </p>
            ) : (
              <p className="mt-3 text-[0.9rem] text-muted">No reviews yet — be the first to share yours.</p>
            )}
          </div>
          {writeButton && (
            <div className="flex flex-col items-start gap-1.5 sm:items-end">
              {writeButton}
              {!user && <p className="text-[0.75rem] text-muted">Sign in first — you&apos;ll come straight back.</p>}
            </div>
          )}
        </div>

        {user && writing && (
          <div className="mt-8">
            <ReviewForm
              productId={productId}
              initial={mine}
              loginHref={loginHref}
              onCancel={() => setWriting(false)}
              onSaved={(review) => {
                setMine(review);
                setWriting(false);
              }}
            />
          </div>
        )}

        {user && mine && !writing && (
          <div className="mt-8 max-w-2xl">
            <OwnReview review={mine} />
          </div>
        )}

        {others.length > 0 && (
          <div className="mt-10 grid gap-10 lg:grid-cols-12">
            <ul className="space-y-2 lg:col-span-4" aria-label="Rating breakdown">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = rated.filter((r) => r.rating === n).length;
                return (
                  <li key={n} className="flex items-center gap-3 text-[0.8rem]">
                    <span className="w-8 tabular-nums text-muted">{n} ★</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${rated.length ? (count / rated.length) * 100 : 0}%` }}
                      />
                    </span>
                    <span className="w-6 text-right tabular-nums text-muted">{count}</span>
                  </li>
                );
              })}
            </ul>
            <ul className="divide-y divide-line border-t border-line lg:col-span-8 lg:border-t-0">
              {others.map((r) => (
                <li key={r.id} className="py-7 first:pt-7 lg:first:pt-0">
                  {r.rating && <Stars rating={r.rating} />}
                  {r.title && <p className="mt-3 font-medium">{r.title}</p>}
                  <p className={cn("text-[1rem] leading-relaxed", r.title ? "mt-1" : "mt-3")}>{r.text}</p>
                  <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] text-muted">
                    <span className="text-ink">{r.displayName}</span>
                    {r.verifiedPurchase && (
                      <span className="inline-flex items-center gap-1 text-success">
                        <BadgeCheck className="size-3.5" /> Verified purchase
                      </span>
                    )}
                    {r.date && <span>{formatDate(r.date)}</span>}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/** The customer's own review, with where it stands. */
function OwnReview({ review }: { review: ProductReview }) {
  const status = {
    pending: { tone: "accent", label: "Awaiting approval", note: "Thanks! It will appear here once the shop has checked it." },
    approved: { tone: "success", label: "Published", note: "Thanks for sharing — other customers can see it." },
    hidden: { tone: "muted", label: "Not published", note: "The shop hasn't published this review. Edit it to send it again." },
  }[review.status] as { tone: "accent" | "success" | "muted"; label: string; note: string };
  return (
    <div className="rounded-card border border-line bg-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.72rem] font-medium uppercase tracking-[0.16em] text-muted">Your review</p>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <Stars rating={review.rating} className="mt-3" />
      {review.title && <p className="mt-2 font-medium">{review.title}</p>}
      <p className="mt-1 leading-relaxed">{review.text}</p>
      <p className="mt-3 text-[0.8rem] text-muted">{status.note}</p>
    </div>
  );
}

function ReviewForm({
  productId,
  initial,
  loginHref,
  onCancel,
  onSaved,
}: {
  productId: string;
  initial: ProductReview | null;
  loginHref: string;
  onCancel: () => void;
  onSaved: (review: ProductReview) => void;
}) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [text, setText] = useState(initial?.text ?? "");
  const [error, setError] = useState<{ rating?: string; text?: string }>({});
  const [saving, setSaving] = useState(false);
  const shown = hover || rating;

  const submit = async () => {
    const problems = {
      ...(!rating && { rating: "Choose a star rating" }),
      ...(text.trim().length < 10 && { text: "Tell us a little more — at least 10 characters" }),
    };
    setError(problems);
    if (Object.keys(problems).length) return;
    setSaving(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, rating, title: title.trim(), text: text.trim() }),
    }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as { review?: ProductReview; error?: string } | null;
    setSaving(false);
    if (res?.status === 401) {
      // The remembered sign-in has ended: sign in again and come back to the form.
      sessionStore.set(null);
      toast("Please sign in again to post your review");
      window.location.href = loginHref;
      return;
    }
    if (!res?.ok || !data?.review) {
      toast.error(data?.error ?? "We couldn't post your review. Please try again.");
      return;
    }
    toast.success(initial ? "Review updated" : "Thanks for your review!", {
      description: "It will appear on this page once the shop has approved it.",
    });
    onSaved(data.review);
  };

  return (
    <form
      noValidate
      aria-label={initial ? "Edit your review" : "Write a review"}
      className="max-w-2xl rounded-card border border-line bg-raised p-5 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p id="rating-label" className="font-serif text-[1.35rem] leading-tight">
        {initial ? "Edit your review" : "How would you rate it?"}
      </p>

      <div className="mt-3 flex items-center gap-3">
        <div role="radiogroup" aria-labelledby="rating-label" className="-ml-1.5 flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""} — ${ratingWords[n]}`}
              onClick={() => {
                setRating(n);
                setError((e) => ({ ...e, rating: undefined }));
              }}
              onMouseEnter={() => setHover(n)}
              className="grid size-10 place-items-center rounded-full transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-brand"
            >
              <Star
                className={cn("size-7 transition-colors", n <= shown ? "fill-accent text-accent" : "text-line-strong")}
                strokeWidth={1.25}
              />
            </button>
          ))}
        </div>
        <span className="text-[0.85rem] text-muted" aria-hidden>
          {shown ? ratingWords[shown] : "Tap a star"}
        </span>
      </div>
      {error.rating && (
        <p role="alert" className="mt-1 text-[0.8rem] text-danger">
          {error.rating}
        </p>
      )}

      {/* The words come once there's a rating, so the first step is a single tap. */}
      {(rating > 0 || initial) && (
        <div className="mt-5 space-y-3">
          <label htmlFor="review-title" className="sr-only">
            Title (optional)
          </label>
          <Input
            id="review-title"
            value={title}
            maxLength={80}
            placeholder="Title (optional)"
            className="h-11 bg-canvas"
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="relative">
            <label htmlFor="review-text" className="sr-only">
              Your review
            </label>
            <Textarea
              id="review-text"
              rows={4}
              maxLength={TEXT_MAX}
              value={text}
              placeholder="What did you like? How was the quality and packing?"
              aria-invalid={Boolean(error.text)}
              aria-describedby={error.text ? "review-text-error" : undefined}
              className="min-h-28 resize-none bg-canvas pb-7"
              onChange={(e) => {
                setText(e.target.value);
                if (error.text && e.target.value.trim().length >= 10) setError((x) => ({ ...x, text: undefined }));
              }}
            />
            {text.length > 0 && (
              <span aria-hidden className="pointer-events-none absolute bottom-2.5 right-4 text-[0.7rem] tabular-nums text-muted">
                {text.trim().length}/{TEXT_MAX}
              </span>
            )}
          </div>
          {error.text && (
            <p id="review-text-error" role="alert" className="text-[0.8rem] text-danger">
              {error.text}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button type="submit" size="sm" className="h-10 px-5" loading={saving}>
          {initial ? "Update review" : "Post review"}
        </Button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
        >
          Cancel
        </button>
        <p className="w-full text-[0.75rem] text-muted sm:ml-auto sm:w-auto">
          Shown with your first name and initial · checked before it appears
        </p>
      </div>
    </form>
  );
}
