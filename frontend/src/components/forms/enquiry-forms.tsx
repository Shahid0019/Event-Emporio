"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { OrderDetail } from "@/components/account/order-detail";
import { Button } from "@/components/ui/button";
import { Field, fieldAria, Input, Select, Textarea } from "@/components/ui/field";
import { DemoNote } from "@/components/ui/primitives";
import { orderStore } from "@/lib/store";
import type { Order } from "@/lib/types";
import { contactSchema, customOrderSchema, trackOrderSchema } from "@/lib/validations";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Submitted({ title, children, onReset }: { title: string; children: React.ReactNode; onReset: () => void }) {
  return (
    <div role="status" className="rounded-card border border-line bg-surface p-8 sm:p-10">
      <CheckCircle2 className="size-8 stroke-[1.5] text-success" />
      <h2 className="mt-6 font-serif text-3xl">{title}</h2>
      <div className="mt-3 leading-relaxed text-muted">{children}</div>
      <DemoNote className="mt-6">Nothing was sent — enquiries are delivered by email once the backend is connected.</DemoNote>
      <button type="button" onClick={onReset} className="mt-6 text-[0.72rem] font-medium uppercase tracking-[0.16em] link-underline">
        Send another
      </button>
    </div>
  );
}

/* --------------------------------- Contact ------------------------------- */
export function ContactForm() {
  const [done, setDone] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<z.input<typeof contactSchema>>({
    resolver: zodResolver(contactSchema),
    defaultValues: { subject: "product" },
  });
  const e = formState.errors;

  if (done) {
    return (
      <Submitted
        title="Message received"
        onReset={() => {
          reset();
          setDone(null);
        }}
      >
        Thank you, {done}. We&apos;ll reply to your email as soon as we can.
      </Submitted>
    );
  }

  return (
    <form
      noValidate
      className="grid gap-5 sm:grid-cols-2"
      onSubmit={handleSubmit(async (v) => {
        await wait(600);
        setDone(v.name.split(" ")[0]);
      })}
    >
      <Field label="Full name" htmlFor="c-name" error={e.name?.message}>
        <Input autoComplete="name" {...fieldAria("c-name", e.name?.message)} {...register("name")} />
      </Field>
      <Field label="Email" htmlFor="c-email" error={e.email?.message}>
        <Input type="email" autoComplete="email" {...fieldAria("c-email", e.email?.message)} {...register("email")} />
      </Field>
      <Field label="Mobile number" htmlFor="c-phone" optional error={e.phone?.message}>
        <Input type="tel" autoComplete="tel" {...fieldAria("c-phone", e.phone?.message)} {...register("phone")} />
      </Field>
      <Field label="Topic" htmlFor="c-subject" error={e.subject?.message}>
        <Select {...fieldAria("c-subject", e.subject?.message)} {...register("subject")}>
          <option value="product">A product question</option>
          <option value="order">An existing order</option>
          <option value="custom">Custom or bulk order</option>
          <option value="other">Something else</option>
        </Select>
      </Field>
      <Field label="Message" htmlFor="c-message" error={e.message?.message} className="sm:col-span-2">
        <Textarea rows={6} {...fieldAria("c-message", e.message?.message)} {...register("message")} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" loading={formState.isSubmitting}>
          Send message
        </Button>
        <p className="mt-4 text-[0.78rem] text-muted">
          We use your details only to respond to this enquiry. See our{" "}
          <Link href="/privacy-policy" className="underline underline-offset-4">
            privacy policy
          </Link>
          .
        </p>
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
        await wait(700);
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
        onSubmit={handleSubmit(async ({ orderNumber, email }) => {
          await wait(500);
          // Both values must match — an order number alone never reveals order details.
          const found = orderStore
            .get()
            .find((o) => o.number.toLowerCase() === orderNumber.trim().toLowerCase() && o.customer.email.toLowerCase() === email);
          setResult(found ?? "missing");
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
