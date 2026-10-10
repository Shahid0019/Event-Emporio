"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { AlertCircle, Lock, ShoppingBag } from "lucide-react";
import { CouponForm, TotalsTable } from "@/components/cart/cart-parts";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox, Field, fieldAria, Input, Select, Textarea } from "@/components/ui/field";
import { DemoNote, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { storeSettings } from "@/lib/data/settings";
import type { Quote } from "@/lib/quote";
import { addressStore, cartStore, clearCart, couponStore, orderStore, sessionStore } from "@/lib/store";
import type { Order } from "@/lib/types";
import { checkoutSchema, indianStates } from "@/lib/validations";
import { cn, formatPrice } from "@/lib/utils";

type Values = z.input<typeof checkoutSchema>;
type Parsed = z.output<typeof checkoutSchema>;

export function CheckoutForm() {
  const router = useRouter();
  const lines = cartStore.useStore();
  const couponCode = couponStore.useStore();
  const user = sessionStore.useStore();
  const addresses = addressStore.useStore();
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

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
      shippingMethod: "standard",
      saveAddress: false,
    },
    resetOptions: { keepDirtyValues: true },
  });
  const { register, handleSubmit, control, formState } = form;
  const errors = formState.errors;
  const shippingMethod = useWatch({ control, name: "shippingMethod" });

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState(false);
  const [paying, setPaying] = useState<Parsed | null>(null);
  const [processing, setProcessing] = useState(false);

  const quoteKey = JSON.stringify([lines.map((l) => [l.productId, l.variantId, l.quantity]), couponCode, shippingMethod]);

  // Authoritative totals from the server whenever the bag, coupon or delivery method changes.
  useEffect(() => {
    const [items, code, method] = JSON.parse(quoteKey) as [[string, string, number][], string | null, string];
    if (!items.length) return;
    const controller = new AbortController();
    fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: items.map(([productId, variantId, quantity]) => ({ productId, variantId, quantity })),
        couponCode: code ?? undefined,
        shippingMethod: method,
      }),
      signal: controller.signal,
    })
      .then((r) => (r.ok ? (r.json() as Promise<Quote>) : Promise.reject(new Error("quote failed"))))
      .then((q) => {
        setQuote(q);
        setQuoteError(false);
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setQuoteError(true);
      });
    return () => controller.abort();
  }, [quoteKey]);

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

  const onSubmit = handleSubmit((values) => {
    if (!quote || quote.lines.length === 0) {
      toast.error("We couldn't confirm your bag. Please refresh and try again.");
      return;
    }
    setPaying(values);
  });

  /** DEMO: stands in for Razorpay Checkout + server-side signature verification. */
  const completePayment = async (outcome: "success" | "failure") => {
    if (!paying || !quote) return;
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 900));
    setProcessing(false);

    if (outcome === "failure") {
      setPaying(null);
      toast.error("Payment didn't go through", { description: "You haven't been charged. Your bag is saved — please try again." });
      return;
    }

    const now = new Date();
    const number = `EE${now.getFullYear().toString().slice(2)}${String(now.getTime()).slice(-6)}`;
    const method = storeSettings.shipping.methods.find((m) => m.id === paying.shippingMethod)!;
    const order: Order = {
      id: number.toLowerCase(),
      number,
      createdAt: now.toISOString(),
      customer: { name: paying.shipping.fullName, email: paying.email, phone: paying.phone },
      shippingAddress: { ...paying.shipping, phone: paying.phone, line2: paying.shipping.line2 || undefined },
      deliveryInstructions: paying.deliveryInstructions || undefined,
      lines: quote.lines.map((ql) => {
        const local = lines.find((l) => l.variantId === ql.variantId)!;
        return {
          productId: ql.productId,
          variantId: ql.variantId,
          slug: local.slug,
          name: ql.name,
          variantLabel: ql.variantLabel,
          image: local.image,
          unitPrice: ql.unitPrice,
          quantity: ql.quantity,
          giftMessage: local.giftMessage,
        };
      }),
      totals: quote.totals,
      couponCode: quote.couponApplied,
      status: "confirmed",
      paymentStatus: "paid",
      paymentMethod: "razorpay",
      paymentReference: `pay_DEMO${String(now.getTime()).slice(-8)}`,
      shippingMethod: method.label,
      history: [
        { status: "pending", at: now.toISOString(), note: "Order placed" },
        { status: "confirmed", at: now.toISOString(), note: "Payment received (demo)" },
      ],
    };

    orderStore.set((orders) => [order, ...orders]);
    if (paying.saveAddress && user) {
      addressStore.set((list) => [
        ...list,
        {
          id: `addr_${now.getTime()}`,
          ...paying.shipping,
          phone: paying.phone,
          line2: paying.shipping.line2 || undefined,
          isDefault: list.length === 0,
        },
      ]);
    }
    clearCart();
    couponStore.set(null);
    router.replace(`/checkout/success?order=${number}`);
  };

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
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

        <Section step={3} title="Delivery method">
          <fieldset>
            <legend className="sr-only">Choose a delivery method</legend>
            <div className="grid gap-3">
              {storeSettings.shipping.methods.map((m) => (
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
                  <span className="text-[0.9rem]">{formatPrice(m.price)}</span>
                </label>
              ))}
            </div>
            {storeSettings.shipping.freeShippingThreshold !== null && (
              <p className="mt-3 text-[0.8rem] text-muted">
                Free delivery on orders over {formatPrice(storeSettings.shipping.freeShippingThreshold)} — applied automatically.
              </p>
            )}
          </fieldset>
        </Section>

        <Section step={4} title="Payment">
          <div className="flex items-start gap-4 rounded-control border border-line-strong bg-raised px-5 py-4">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="text-[0.95rem] font-medium">Pay securely with Razorpay</p>
              <p className="mt-1 text-[0.82rem] text-muted">
                UPI, cards, net banking and wallets. You&apos;ll complete payment in Razorpay&apos;s secure window.
              </p>
            </div>
          </div>
          {!storeSettings.payments.codEnabled && (
            <p className="mt-3 text-[0.8rem] text-muted">Cash on delivery is not currently available.</p>
          )}
        </Section>

        <div className="space-y-4">
          <Button type="submit" size="lg" className="w-full" disabled={!quote || quote.lines.length === 0}>
            {quote ? `Pay ${formatPrice(quote.totals.total)}` : "Confirming your bag…"}
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
      </form>

      <aside aria-label="Order summary" className="lg:col-span-5">
        <div className="space-y-6 rounded-card bg-surface p-6 sm:p-8 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <h2 className="font-serif text-3xl">Order summary</h2>
          <ul className="space-y-4">
            {lines.map((l) => (
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
            ))}
          </ul>

          {quote?.issues.map((issue) => (
            <p key={issue.variantId} role="alert" className="flex gap-2 text-[0.82rem] text-danger">
              <AlertCircle className="size-4 shrink-0" />
              {issue.message}
            </p>
          ))}

          <CouponForm code={couponCode} coupon={quote?.couponError ? { ok: false, reason: quote.couponError } : null} />

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
        open={paying !== null}
        onOpenChange={(open) => !open && !processing && setPaying(null)}
        title="Complete payment"
        description={quote ? `Amount due: ${formatPrice(quote.totals.total)}` : undefined}
        side="center"
      >
        <DemoNote>
          Razorpay isn&apos;t connected in this frontend build. In production this window is Razorpay Checkout, and the order is only
          confirmed after the server verifies the payment signature and webhook.
        </DemoNote>
        <div className="mt-6 grid gap-3">
          <Button size="lg" loading={processing} onClick={() => completePayment("success")}>
            Simulate successful payment
          </Button>
          <Button size="lg" variant="outline" disabled={processing} onClick={() => completePayment("failure")}>
            Simulate failed payment
          </Button>
        </div>
      </Sheet>
    </div>
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
