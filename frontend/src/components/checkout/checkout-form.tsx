"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { AlertCircle, ArrowRight, Banknote, CalendarDays, ChevronRight, Lock, MapPin, ShoppingBag, Truck } from "lucide-react";
import { CouponForm, KitMosaic, TotalsTable } from "@/components/cart/cart-parts";
import { groupCart } from "@/lib/cart-groups";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox, Field, fieldAria, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { useStoreSettings } from "@/components/providers/store-data";
import { useCartTotals } from "@/components/cart/use-cart-totals";
import type { CheckoutStart } from "@/app/api/checkout/order/route";
import { storeSettings } from "@/lib/data/settings";
import { SHIPPING_METHODS, shippingPrice } from "@/lib/settings";
import { formatEventDate } from "@/lib/kit/format";
import { kitStore } from "@/lib/kit/store";
import { clearCart, couponStore, sessionStore } from "@/lib/store";
import type { Address, CartLine, OrderTotals } from "@/lib/types";
import { checkoutSchema, indianStates } from "@/lib/validations";
import { cn, formatPrice } from "@/lib/utils";

type Values = z.input<typeof checkoutSchema>;
type Parsed = z.output<typeof checkoutSchema>;

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", cb: (r: { error?: { description?: string } }) => void): void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

/** Loads Razorpay Checkout once. */
function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const reportFailed = (start: CheckoutStart, reason: string) =>
  fetch("/api/checkout/failed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: start.orderId, token: start.token, reason }),
  }).catch(() => undefined);

export function CheckoutForm() {
  const router = useRouter();
  const settings = useStoreSettings();
  const user = sessionStore.useStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

  // Signed-in customers get their saved delivery address filled in.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch("/api/account/addresses")
      .then((r) => (r.ok ? (r.json() as Promise<{ addresses: Address[] }>) : null))
      .then((data) => {
        if (!cancelled && data) setAddresses(data.addresses);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user]);

  const form = useForm<Values, unknown, Parsed>({
    resolver: zodResolver(checkoutSchema),
    mode: "onTouched",
    values: {
      email: user?.email ?? "",
      phone: defaultAddress?.phone ?? user?.phone ?? "",
      shipping: {
        fullName: defaultAddress?.fullName ?? user?.name ?? "",
        line1: defaultAddress?.line1 ?? "",
        line2: defaultAddress?.line2 ?? "",
        city: defaultAddress?.city ?? "",
        state: defaultAddress?.state ?? "",
        pincode: defaultAddress?.pincode ?? "",
        country: "India",
      },
      deliveryInstructions: "",
      // The date picked while planning a function, if any.
      firstFunctionDate: kitStore.get().eventDate ?? "",
      shippingMethod: "standard",
      paymentMethod: "razorpay",
      saveAddress: false,
    },
    resetOptions: { keepDirtyValues: true },
  });
  const { register, handleSubmit, control, formState } = form;
  const errors = formState.errors;
  const shippingMethod = useWatch({ control, name: "shippingMethod" });
  // If the shop turns cash on delivery off, a COD choice falls back to paying online.
  const codEnabled = settings.payments.codEnabled;
  const chosenPayment = useWatch({ control, name: "paymentMethod" });
  const paymentMethod = codEnabled && chosenPayment === "cod" ? "cod" : "razorpay";

  const { lines, code: couponCode, quote, failed: quoteError } = useCartTotals(shippingMethod);
  const [testPayment, setTestPayment] = useState<CheckoutStart | null>(null);
  const [processing, setProcessing] = useState(false);
  // Checked details waiting on the Review step (handbook screen 08) before paying.
  const [review, setReview] = useState<Parsed | null>(null);

  if (!lines.length) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-6 stroke-[1.25]" />}
        title="Your bag is empty"
        description="Add something to your bag to check out."
        action={
          <Link href="/shop" className={buttonVariants()}>
            Continue shopping
          </Link>
        }
      />
    );
  }

  const finish = (start: CheckoutStart) => {
    clearCart();
    couponStore.set(null);
    router.replace(`/checkout/success?order=${encodeURIComponent(start.number)}&t=${encodeURIComponent(start.token)}`);
  };

  const saveAddressToAccount = (values: Parsed) =>
    fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values.shipping, phone: values.phone }),
    }).catch(() => undefined);

  // Details first, then a review screen; payment starts only from the review.
  const onSubmit = handleSubmit((values) => {
    setReview(values);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  const editDetails = (field?: string) => {
    setReview(null);
    if (field) requestAnimationFrame(() => document.getElementById(field)?.scrollIntoView({ block: "center" }));
  };

  const placeOrder = async (values: Parsed) => {
    if (!quote || quote.lines.length === 0) {
      toast.error("We couldn't confirm your bag. Please refresh and try again.");
      return;
    }
    setProcessing(true);
    const res = await fetch("/api/checkout/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        paymentMethod,
        couponCode: couponCode ?? undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          quantity: l.quantity,
          ...(l.giftMessage && { giftMessage: l.giftMessage }),
          ...(l.bundle && {
            bundle: {
              id: l.bundle.id,
              name: l.bundle.name,
              summary: l.bundle.summary,
            },
          }),
        })),
      }),
    }).catch(() => null);
    const data: unknown = await res?.json().catch(() => null);
    if (!res?.ok) {
      setProcessing(false);
      const message = data && typeof data === "object" && "error" in data ? String((data as { error: unknown }).error) : "";
      toast.error(
        message ||
          (paymentMethod === "cod"
            ? "We couldn't place your order. Please try again."
            : "We couldn't start your payment. Please try again."),
      );
      return;
    }
    const start = data as CheckoutStart;
    if (values.saveAddress && user) void saveAddressToAccount(values);

    if (start.mode === "cod") {
      finish(start);
      return;
    }

    if (start.mode === "test") {
      setProcessing(false);
      setTestPayment(start);
      return;
    }

    if (!(await loadRazorpay()) || !window.Razorpay || !start.razorpay) {
      setProcessing(false);
      toast.error("Couldn't open the payment window. Check your connection and try again.");
      return;
    }
    const checkout = new window.Razorpay({
      key: start.razorpay.keyId,
      amount: start.amount,
      currency: "INR",
      name: storeSettings.name,
      description: `Order ${start.number}`,
      order_id: start.razorpay.orderId,
      prefill: start.prefill,
      theme: { color: "#425e2a" },
      handler: async (response: RazorpayResponse) => {
        const confirm = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        }).catch(() => null);
        if (confirm?.ok) finish(start);
        else {
          setProcessing(false);
          toast.error("We couldn't confirm your payment", {
            description: `If money was taken, it's safe — contact us with order ${start.number} and we'll sort it out.`,
          });
        }
      },
      modal: {
        ondismiss: () => {
          setProcessing(false);
          void reportFailed(start, "Payment window closed");
          toast("Payment not completed", { description: "You haven't been charged. Your bag is saved." });
        },
      },
    });
    checkout.on("payment.failed", (r) => {
      void reportFailed(start, r.error?.description ?? "Payment failed");
      toast.error("Payment didn't go through", { description: "You haven't been charged. Try again or use another method." });
    });
    checkout.open();
  };

  /** Local development only (no Razorpay keys): finish or fail the payment by hand. */
  const completeTestPayment = async (outcome: "success" | "failure") => {
    if (!testPayment) return;
    setProcessing(true);
    const res = await fetch("/api/checkout/test-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: testPayment.orderId, token: testPayment.token, outcome }),
    }).catch(() => null);
    setProcessing(false);
    if (outcome === "success" && res?.ok) {
      finish(testPayment);
      return;
    }
    setTestPayment(null);
    toast.error("Payment didn't go through", { description: "You haven't been charged. Your bag is saved — please try again." });
  };

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      {review ? (
        <ReviewOrder
          values={review}
          lines={lines}
          totals={quote?.totals}
          paymentMethod={paymentMethod}
          processing={processing}
          onEdit={editDetails}
          onPlace={() => void placeOrder(review)}
        />
      ) : (
      <form onSubmit={onSubmit} noValidate className="space-y-12 lg:col-span-7" aria-label="Checkout">
        <Section step={1} title="Contact">
          {!user && (
            <p className="mb-5 text-[0.88rem] text-muted">
              Checking out as a guest.{" "}
              <Link href="/login?next=/checkout" className="text-ink underline underline-offset-4">
                Sign in
              </Link>{" "}
              for faster checkout — not required.
            </p>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Email" htmlFor="email" error={errors.email?.message} hint="For your order confirmation">
              <Input type="email" autoComplete="email" {...fieldAria("email", errors.email?.message, true)} {...register("email")} />
            </Field>
            <Field label="Mobile number" htmlFor="phone" error={errors.phone?.message} hint="For delivery updates">
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="10-digit mobile"
                {...fieldAria("phone", errors.phone?.message, true)}
                {...register("phone")}
              />
            </Field>
          </div>
        </Section>

        <Section step={2} title="Delivery address">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="fullName" error={errors.shipping?.fullName?.message} className="sm:col-span-2">
              <Input
                autoComplete="name"
                {...fieldAria("fullName", errors.shipping?.fullName?.message)}
                {...register("shipping.fullName")}
              />
            </Field>
            <Field label="Address line 1" htmlFor="line1" error={errors.shipping?.line1?.message} className="sm:col-span-2">
              <Input
                autoComplete="address-line1"
                placeholder="House no., building, street"
                {...fieldAria("line1", errors.shipping?.line1?.message)}
                {...register("shipping.line1")}
              />
            </Field>
            <Field label="Address line 2" htmlFor="line2" optional error={errors.shipping?.line2?.message} className="sm:col-span-2">
              <Input
                autoComplete="address-line2"
                placeholder="Area, landmark"
                {...fieldAria("line2", errors.shipping?.line2?.message)}
                {...register("shipping.line2")}
              />
            </Field>
            <Field label="City" htmlFor="city" error={errors.shipping?.city?.message}>
              <Input autoComplete="address-level2" {...fieldAria("city", errors.shipping?.city?.message)} {...register("shipping.city")} />
            </Field>
            <Field label="PIN code" htmlFor="pincode" error={errors.shipping?.pincode?.message}>
              <Input
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                {...fieldAria("pincode", errors.shipping?.pincode?.message)}
                {...register("shipping.pincode")}
              />
            </Field>
            <Field label="State / UT" htmlFor="state" error={errors.shipping?.state?.message}>
              <Select
                autoComplete="address-level1"
                {...fieldAria("state", errors.shipping?.state?.message)}
                {...register("shipping.state")}
              >
                <option value="">Select…</option>
                {indianStates.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Country" htmlFor="country">
              <Input id="country" value="India" readOnly disabled />
            </Field>
            <Field
              label="Delivery instructions"
              htmlFor="deliveryInstructions"
              optional
              error={errors.deliveryInstructions?.message}
              className="sm:col-span-2"
            >
              <Textarea
                rows={3}
                className="min-h-24"
                placeholder="Gate code, preferred time, etc."
                {...fieldAria("deliveryInstructions", errors.deliveryInstructions?.message)}
                {...register("deliveryInstructions")}
              />
            </Field>
            {user && <Checkbox className="sm:col-span-2" label="Save this address to my account" {...register("saveAddress")} />}
          </div>
        </Section>

        <Section step={3} title="When is your first function?">
          <Field
            label="First function date"
            htmlFor="firstFunctionDate"
            optional
            hint="Helps us plan your delivery in time. It isn't a fixed delivery slot."
            error={errors.firstFunctionDate?.message}
          >
            <Input
              type="date"
              // Earliest choice is today, set when opened (a date read while rendering would be frozen at build time).
              onFocus={(e) => (e.currentTarget.min = localToday())}
              {...fieldAria("firstFunctionDate", errors.firstFunctionDate?.message)}
              {...register("firstFunctionDate")}
            />
          </Field>
          <OneDelivery className="mt-5" />
        </Section>

        <Section step={4} title="Delivery method">
          <fieldset>
            <legend className="sr-only">Choose a delivery method</legend>
            <div className="grid gap-3">
              {SHIPPING_METHODS.map((m) => (
                <label
                  key={m.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-4 rounded-control border bg-raised px-5 py-4 transition-colors",
                    shippingMethod === m.id ? "border-ink" : "border-line-strong hover:border-muted",
                  )}
                >
                  <input type="radio" value={m.id} className="size-4 accent-[var(--brand)]" {...register("shippingMethod")} />
                  <span className="flex-1">
                    <span className="block text-[0.95rem] font-medium">{m.label}</span>
                    <span className="block text-[0.82rem] text-muted">{m.description}</span>
                  </span>
                  <span className="text-[0.9rem]">{formatPrice(shippingPrice(settings, m.id))}</span>
                </label>
              ))}
            </div>
            {settings.shipping.freeShippingThreshold !== null && (
              <p className="mt-3 text-[0.8rem] text-muted">
                Free delivery on orders over {formatPrice(settings.shipping.freeShippingThreshold)} — applied automatically.
              </p>
            )}
          </fieldset>
        </Section>

        <Section step={5} title="Payment">
          {codEnabled ? (
            <fieldset>
              <legend className="sr-only">Choose how to pay</legend>
              <div className="grid gap-3">
                {(
                  [
                    {
                      id: "razorpay",
                      icon: Lock,
                      title: "Pay online",
                      text: "UPI, cards, net banking and wallets, in Razorpay's secure window.",
                    },
                    {
                      id: "cod",
                      icon: Banknote,
                      title: "Cash on delivery",
                      text: "Pay in cash when your order arrives.",
                    },
                  ] as const
                ).map(({ id, icon: Icon, title, text }) => (
                  <label
                    key={id}
                    className={cn(
                      "flex cursor-pointer items-center gap-4 rounded-control border bg-raised px-5 py-4 transition-colors",
                      paymentMethod === id ? "border-ink" : "border-line-strong hover:border-muted",
                    )}
                  >
                    <input type="radio" value={id} className="size-4 accent-[var(--brand)]" {...register("paymentMethod")} />
                    <span className="flex-1">
                      <span className="block text-[0.95rem] font-medium">{title}</span>
                      <span className="block text-[0.82rem] text-muted">{text}</span>
                    </span>
                    <Icon aria-hidden className="size-4 shrink-0 text-muted" />
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <>
              <div className="flex items-start gap-4 rounded-control border border-line-strong bg-raised px-5 py-4">
                <Lock className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="text-[0.95rem] font-medium">Pay securely with Razorpay</p>
                  <p className="mt-1 text-[0.82rem] text-muted">
                    UPI, cards, net banking and wallets. You&apos;ll complete payment in Razorpay&apos;s secure window.
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[0.8rem] text-muted">Cash on delivery is not currently available.</p>
            </>
          )}
        </Section>

        <div className="space-y-4">
          <Button type="submit" size="lg" className="w-full" disabled={!quote || quote.lines.length === 0}>
            {!quote ? "Confirming your bag…" : "Review order"}
            {quote && <ArrowRight aria-hidden />}
          </Button>
          <p className="text-center text-[0.78rem] leading-relaxed text-muted">You&apos;ll see the exact total before you pay.</p>
        </div>
      </form>
      )}

      <aside aria-label="Order summary" className="lg:col-span-5">
        <div className="space-y-6 rounded-card bg-surface p-6 sm:p-8 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <h2 className="font-serif text-3xl">Order summary</h2>
          <ul className="space-y-4">
            {groupCart(lines).map((entry) => {
              if (entry.type === "kit") {
                return (
                  <li key={entry.key} className="flex items-center gap-4">
                    <KitMosaic lines={entry.lines} className="w-16" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-lg leading-tight">{entry.bundle.name}</span>
                      <span className="text-[0.8rem] text-muted">{entry.bundle.summary}</span>
                    </span>
                    <span className="text-[0.9rem]">{formatPrice(entry.total)}</span>
                  </li>
                );
              }
              const l = entry.line;
              return (
                <li key={l.key} className="flex items-center gap-4">
                  <span className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-chip bg-canvas">
                    <Image src={l.image.src} alt="" fill sizes="64px" className="object-cover" />
                    <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-ink text-[0.65rem] text-canvas">
                      {l.quantity}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif text-lg leading-tight">{l.name}</span>
                    {l.variantLabel && <span className="text-[0.8rem] text-muted">{l.variantLabel}</span>}
                  </span>
                  <span className="text-[0.9rem]">{formatPrice(l.unitPrice * l.quantity)}</span>
                </li>
              );
            })}
          </ul>

          {quote?.issues.map((issue) => (
            <p key={issue.variantId} role="alert" className="flex gap-2 text-[0.82rem] text-danger">
              <AlertCircle className="size-4 shrink-0" />
              {issue.message}
            </p>
          ))}

          <CouponForm
            code={couponCode}
            coupon={quote?.couponError ? { ok: false, reason: quote.couponError } : null}
            offers={quote?.offers}
          />

          {quote ? (
            <TotalsTable totals={quote.totals} />
          ) : quoteError ? (
            <p role="alert" className="text-[0.85rem] text-danger">
              We couldn&apos;t confirm prices right now. Check your connection and refresh.
            </p>
          ) : (
            <div className="space-y-3" role="status" aria-label="Calculating totals">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-8 w-full" />
            </div>
          )}
          <p className="text-[0.75rem] text-muted">Totals are calculated on our server from current prices and stock.</p>
        </div>
      </aside>

      <Sheet
        open={testPayment !== null}
        onOpenChange={(open) => !open && !processing && setTestPayment(null)}
        title="Test payment"
        description={testPayment ? `Order ${testPayment.number} · ${formatPrice(testPayment.amount)}` : undefined}
        side="center"
      >
        <p className="rounded-control border border-accent/50 bg-accent-soft/40 px-4 py-3 text-[0.85rem] leading-relaxed">
          Razorpay keys aren&apos;t set on this computer, so this stands in for the payment window. Add{" "}
          <code className="text-[0.8rem]">RAZORPAY_KEY_ID</code> and <code className="text-[0.8rem]">RAZORPAY_KEY_SECRET</code> to{" "}
          <code className="text-[0.8rem]">.env.local</code> to use real Razorpay test mode. This never appears on the live site.
        </p>
        <div className="mt-6 grid gap-3">
          <Button size="lg" loading={processing} onClick={() => completeTestPayment("success")}>
            Simulate successful payment
          </Button>
          <Button size="lg" variant="outline" disabled={processing} onClick={() => completeTestPayment("failure")}>
            Simulate failed payment
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

/** Everything ships together; the date only helps planning (handbook: no promised slot). */
function OneDelivery({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-control bg-surface px-4 py-3.5 text-[0.88rem]", className)}>
      <Truck aria-hidden className="mt-0.5 size-5 shrink-0 text-accent-ink" />
      <p>
        <span className="font-medium">One delivery for your entire order.</span>{" "}
        <span className="text-muted">
          All your function supplies come together, ahead of your first function. Our team will confirm the delivery schedule with you.
        </span>
      </p>
    </div>
  );
}

/** Handbook screen 08: one last look at everything, then pay. */
function ReviewOrder({
  values,
  lines,
  totals,
  paymentMethod,
  processing,
  onEdit,
  onPlace,
}: {
  values: Parsed;
  lines: CartLine[];
  totals?: OrderTotals;
  paymentMethod: "razorpay" | "cod";
  processing: boolean;
  onEdit: (field?: string) => void;
  onPlace: () => void;
}) {
  const entries = groupCart(lines);
  const a = values.shipping;
  const card = "rounded-card border border-line bg-raised p-4 sm:p-5";
  const head = "flex items-center justify-between gap-3";
  const edit = "inline-flex min-h-10 items-center gap-1 rounded-chip px-2 text-[0.85rem] font-medium text-brand hover:bg-surface";

  return (
    <section aria-labelledby="review-title" className="space-y-4 lg:col-span-7">
      <div>
        <h2 id="review-title" className="font-serif text-[2rem] leading-tight">
          Review your order
        </h2>
        <p className="mt-1 text-[0.9rem] text-muted">Almost done — please check your details before placing the order.</p>
      </div>

      <div className={card}>
        <div className={head}>
          <h3 className="inline-flex items-center gap-2 font-sans text-[1rem] font-semibold tracking-normal">
            <ShoppingBag aria-hidden className="size-4 text-accent-ink" /> Your wedding supplies
          </h3>
          <Link href="/cart" className={edit}>
            Edit <ChevronRight aria-hidden className="size-4" />
          </Link>
        </div>
        <ul className="mt-2 divide-y divide-line">
          {entries.map((e) => (
            <li key={e.key} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate font-medium">{e.type === "kit" ? e.bundle.name : e.line.name}</span>
                <span className="block truncate text-[0.8rem] text-muted">
                  {e.type === "kit" ? e.bundle.summary : `${e.line.variantLabel ? `${e.line.variantLabel} · ` : ""}Qty ${e.line.quantity}`}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{formatPrice(e.type === "kit" ? e.total : e.line.unitPrice * e.line.quantity)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={card}>
        <div className={head}>
          <h3 className="inline-flex items-center gap-2 font-sans text-[1rem] font-semibold tracking-normal">
            <MapPin aria-hidden className="size-4 text-accent-ink" /> Delivery details
          </h3>
          <button type="button" onClick={() => onEdit("fullName")} className={edit}>
            Edit <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
        <address className="mt-2 text-[0.92rem] not-italic leading-relaxed">
          <span className="font-medium">{a.fullName}</span> · {values.phone}
          <br />
          {a.line1}
          {a.line2 && <>, {a.line2}</>}
          <br />
          {a.city}, {a.state} – {a.pincode}
        </address>
        <p className="mt-1 text-[0.82rem] text-muted">{values.email}</p>
      </div>

      <div className={card}>
        <div className={head}>
          <h3 className="inline-flex items-center gap-2 font-sans text-[1rem] font-semibold tracking-normal">
            <CalendarDays aria-hidden className="size-4 text-accent-ink" /> First function date
          </h3>
          <button type="button" onClick={() => onEdit("firstFunctionDate")} className={edit}>
            Edit <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-[0.95rem]">
          {values.firstFunctionDate ? formatEventDate(values.firstFunctionDate, "long") : <span className="text-muted">Not given — we&apos;ll ask when we call</span>}
        </p>
      </div>

      <OneDelivery />

      <div className={card}>
        <h3 className="inline-flex items-center gap-2 font-sans text-[1rem] font-semibold tracking-normal">
          <Lock aria-hidden className="size-4 text-accent-ink" /> Payment summary
        </h3>
        <div className="mt-3">{totals ? <TotalsTable totals={totals} /> : <Skeleton className="h-24 w-full" />}</div>
        <p className="mt-3 text-[0.85rem] text-muted">
          Paying by <span className="font-medium text-ink">{paymentMethod === "cod" ? "cash on delivery" : "UPI / card (Razorpay)"}</span> ·{" "}
          <button type="button" onClick={() => onEdit("paymentMethod")} className="text-brand underline underline-offset-4">
            change
          </button>
        </p>
      </div>

      <div className="space-y-3 pt-1">
        <Button size="lg" className="h-14 w-full" loading={processing} disabled={!totals} onClick={onPlace}>
          {paymentMethod === "cod" ? "Place order" : "Pay & place order"}
          {totals && ` · ${formatPrice(totals.total)}`}
        </Button>
        <p className="text-center text-[0.78rem] leading-relaxed text-muted">
          By placing your order you agree to our{" "}
          <Link href="/terms" className="underline underline-offset-4">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${step}`}>
      <h2 id={`step-${step}`} className="mb-6 flex items-baseline gap-4 border-b border-line pb-4 font-serif text-[1.9rem]">
        <span className="font-sans text-[0.72rem] font-medium tracking-[0.18em] text-accent-ink">0{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Today's date (YYYY-MM-DD) in the shopper's own time zone. */
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
