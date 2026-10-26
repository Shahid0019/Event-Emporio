"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CheckCircle2, Send } from "lucide-react";
import { OrderDetail } from "@/components/account/order-detail";
import { Button } from "@/components/ui/button";
import { Field, fieldAria, Input, Select, Textarea } from "@/components/ui/field";
import { sendJson } from "@/lib/api-client";
import { sessionStore } from "@/lib/store";
import type { Order } from "@/lib/types";
import { contactSchema, customOrderSchema, trackOrderSchema } from "@/lib/validations";

function Submitted({ title, children, onReset }: { title: string; children: React.ReactNode; onReset: () => void }) {
  return (
    <div role="status" className="rounded-card border border-line bg-surface p-8 sm:p-10">
      <CheckCircle2 className="size-8 stroke-[1.5] text-success" />
      <h2 className="mt-6 font-serif text-3xl">{title}</h2>cd
      <div className="mt-3 leading-relaxed text-muted">{children}</div>
      <button type="button" onClick={onReset} className="mt-6 text-[0.72rem] font-medium uppercase tracking-[0.16em] link-underline">
        Send another
      </button>
    </div>
  );
}

/* --------------------------------- Contact ------------------------------- */
const topics = [
  { value: "product", label: "A product", placeholder: "Which product, and what would you like to know?" },
  { value: "order", label: "My order", placeholder: "Your order number (e.g. EE2600123) and how we can help." },
  { value: "custom", label: "Custom or bulk", placeholder: "The occasion, rough quantity and date — we'll take it from there." },
  { value: "other", label: "Something else", placeholder: "How can we help?" },
] as const;

export function ContactForm() {
  const [done, setDone] = useState<{ name: string; email: string } | null>(null);
  const { register, handleSubmit, reset, formState, control, getValues, setValue } = useForm<z.input<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: { subject: "product", name: "", email: "", phone: "", message: "" },
  });
  const e = formState.errors;
  const [subject, message] = useWatch({ control, name: ["subject", "message"] });
  const topic = topics.find((t) => t.value === subject) ?? topics[0];

  // Signed-in customers don't retype their name and email.
  const user = sessionStore.useStore();
  useEffect(() => {
    if (!user) return;
    if (!getValues("name")) setValue("name", user.name);
    if (!getValues("email")) setValue("email", user.email);
    if (!getValues("phone") && user.phone) setValue("phone", user.phone);
  }, [user, getValues, setValue]);

  if (done) {
    return (
      <Submitted
        title="Message received"
        onReset={() => {
          reset({ subject: "product", name: done.name, email: done.email, phone: getValues("phone"), message: "" });
          setDone(null);
        }}
      >
        Thank you, {done.name.split(" ")[0]}. We&apos;ll reply to <span className="font-medium text-ink">{done.email}</span> as soon as we
        can.
      </Submitted>
    );
  }

  return (
    <form
      noValidate
      aria-label="Contact"
      className="grid gap-6 sm:grid-cols-2"
      onSubmit={handleSubmit(async (v) => {
        const res = await sendJson("/api/forms/contact", v);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setDone({ name: v.name.trim(), email: v.email.trim() });
      })}
    >
      <fieldset className="sm:col-span-2">
        <legend className="mb-3 text-[0.85rem] font-medium">What&apos;s it about?</legend>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <label key={t.value} className="cursor-pointer">
              <input type="radio" value={t.value} className="peer sr-only" {...register("subject")} />
              <span className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-4 text-[0.88rem] transition-colors hover:border-ink peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                {t.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Full name" htmlFor="c-name" error={e.name?.message}>
        <Input autoComplete="name" {...fieldAria("c-name", e.name?.message)} {...register("name")} />
      </Field>
      <Field label="Email" htmlFor="c-email" error={e.email?.message} hint={e.email ? undefined : "We'll reply here"}>
        <Input type="email" autoComplete="email" {...fieldAria("c-email", e.email?.message, !e.email)} {...register("email")} />
      </Field>
      <Field label="Mobile number" htmlFor="c-phone" optional error={e.phone?.message} className="sm:col-span-2">
        <Input type="tel" inputMode="tel" autoComplete="tel" {...fieldAria("c-phone", e.phone?.message)} {...register("phone")} />
      </Field>
      <Field
        label="Message"
        htmlFor="c-message"
        error={e.message?.message}
        hint={e.message ? undefined : `${(message ?? "").trim().length} / 2000`}
        className="sm:col-span-2"
      >
        <Textarea
          rows={6}
          maxLength={2000}
          placeholder={topic.placeholder}
          {...fieldAria("c-message", e.message?.message, !e.message)}
          {...register("message")}
        />
      </Field>
      <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.78rem] text-muted sm:max-w-sm">
          We use your details only to reply to this message. See our{" "}
          <Link href="/privacy-policy" className="underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
        <Button type="submit" size="lg" loading={formState.isSubmitting} className="sm:shrink-0">
          <Send /> Send message
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------- Custom order ---------------------------- */
export function CustomOrderForm() {
  const [done, setDone] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<
    z.input<typeof customOrderSchema>,
    unknown,
    z.output<typeof customOrderSchema>
  >({
    resolver: zodResolver(customOrderSchema),
    defaultValues: { budget: "unsure", quantity: 1 },
  });
  const e = formState.errors;

  if (done) {
    return (
      <Submitted
        title="Request received"
        onReset={() => {
          reset();
          setDone(null);
        }}
      >
        Thank you, {done}. We&apos;ll review your brief and get back to you with options and a quote.
      </Submitted>
    );
  }

  return (
    <form
      noValidate
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={handleSubmit(async (v) => {
        const res = await sendJson("/api/forms/custom-order", v);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setDone(v.name.split(" ")[0]);
      })}
    >
      <Field label="Full name" htmlFor="co-name" error={e.name?.message}>
        <Input autoComplete="name" {...fieldAria("co-name", e.name?.message)} {...register("name")} />
      </Field>
      <Field label="Mobile number" htmlFor="co-phone" error={e.phone?.message}>
        <Input type="tel" autoComplete="tel" {...fieldAria("co-phone", e.phone?.message)} {...register("phone")} />
      </Field>
      <Field label="Email" htmlFor="co-email" error={e.email?.message} className="sm:col-span-2">
        <Input type="email" autoComplete="email" {...fieldAria("co-email", e.email?.message)} {...register("email")} />
      </Field>
      <Field label="Occasion" htmlFor="co-occasion" error={e.occasion?.message}>
        <Select {...fieldAria("co-occasion", e.occasion?.message)} {...register("occasion")} defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          <option value="wedding">Wedding</option>
          <option value="mehndi">Mehndi</option>
          <option value="engagement">Engagement</option>
          <option value="corporate">Corporate gifting</option>
          <option value="festive">Festive</option>
          <option value="other">Other</option>
        </Select>
      </Field>
      <Field label="Event date" htmlFor="co-date" optional>
        <Input type="date" id="co-date" {...register("eventDate")} />
      </Field>
      <Field label="Approximate quantity" htmlFor="co-qty" error={e.quantity?.message}>
        <Input type="number" inputMode="numeric" min={1} {...fieldAria("co-qty", e.quantity?.message)} {...register("quantity")} />
      </Field>
      <Field label="Budget per piece" htmlFor="co-budget" error={e.budget?.message}>
        <Select {...fieldAria("co-budget", e.budget?.message)} {...register("budget")}>
          <option value="unsure">Not sure yet</option>
          <option value="under-1k">Under ₹1,000</option>
          <option value="1k-2.5k">₹1,000 – ₹2,500</option>
          <option value="2.5k-5k">₹2,500 – ₹5,000</option>
          <option value="5k-10k">₹5,000 – ₹10,000</option>
          <option value="above-10k">Above ₹10,000</option>
        </Select>
      </Field>
      <Field
        label="Tell us about your idea"
        htmlFor="co-details"
        error={e.details?.message}
        hint="Colours, theme, contents, packaging, names to personalise — anything helps."
        className="sm:col-span-2"
      >
        <Textarea rows={6} {...fieldAria("co-details", e.details?.message, true)} {...register("details")} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" loading={formState.isSubmitting}>
          Request a quote
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------- Track order ----------------------------- */
export function TrackOrderForm() {
  const [result, setResult] = useState<Order | "missing" | null>(null);
  const { register, handleSubmit, formState } = useForm<z.input<typeof trackOrderSchema>>({ resolver: zodResolver(trackOrderSchema) });
  const e = formState.errors;

  return (
    <>
      <form
        noValidate
        className="grid gap-5 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
        onSubmit={handleSubmit(async (v) => {
          // Both values must match — an order number alone never reveals order details.
          const res = await sendJson<{ order: Order }>("/api/orders/track", v);
          if (res.ok) setResult(res.data.order);
          else if (res.status === 404) setResult("missing");
          else toast.error(res.error);
        })}
      >
        <Field label="Order number" htmlFor="t-number" error={e.orderNumber?.message}>
          <Input placeholder="e.g. EE26123456" {...fieldAria("t-number", e.orderNumber?.message)} {...register("orderNumber")} />
        </Field>
        <Field label="Email used for the order" htmlFor="t-email" error={e.email?.message}>
          <Input type="email" autoComplete="email" {...fieldAria("t-email", e.email?.message)} {...register("email")} />
        </Field>
        <Button type="submit" size="md" className="sm:mt-[1.85rem]" loading={formState.isSubmitting}>
          Track
        </Button>
      </form>

      <div aria-live="polite" className="mt-12">
        {result === "missing" && (
          <p className="rounded-control border-l-2 border-danger bg-danger/5 px-5 py-4 text-[0.92rem]">
            We couldn&apos;t find an order with those details. Check the order number in your confirmation and try again.
          </p>
        )}
        {result && result !== "missing" && (
          <div>
            <h2 className="mb-8 font-serif text-3xl">Order {result.number}</h2>
            <OrderDetail order={result} />
          </div>
        )}
      </div>
    </>
  );
}
