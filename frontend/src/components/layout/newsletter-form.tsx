"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import type { z } from "zod";
import { newsletterSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";

type Values = z.input<typeof newsletterSchema>;

export function NewsletterForm({ tone = "dark", idPrefix = "nl" }: { tone?: "dark" | "light"; idPrefix?: string }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(newsletterSchema), defaultValues: { email: "" } });

  const onSubmit = handleSubmit(async () => {
    // DEMO: the subscription endpoint (with double opt-in) is part of the backend phase.
    await new Promise((r) => setTimeout(r, 500));
    reset();
    toast.success("You're on the list", { description: "Demo mode — no email was stored." });
  });

  const light = tone === "light";
  const emailId = `${idPrefix}-email`;
  const consentId = `${idPrefix}-consent`;

  return (
    <form onSubmit={onSubmit} noValidate className="w-full">
      <div
        className={cn(
          "flex items-center border-b transition-colors focus-within:border-current",
          light ? "border-canvas/40" : "border-line-strong",
        )}
      >
        <label htmlFor={emailId} className="sr-only">
          Email address
        </label>
        <input
          id={emailId}
          type="email"
          autoComplete="email"
          placeholder="Your email address"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
          className={cn(
            "h-14 min-w-0 flex-1 bg-transparent text-[1rem] focus:outline-none",
            light ? "text-canvas placeholder:text-canvas/55" : "text-ink placeholder:text-muted",
          )}
          {...register("email")}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-14 items-center gap-2 pl-4 text-[0.7rem] font-medium uppercase tracking-[0.18em] disabled:opacity-50"
        >
          {isSubmitting ? "Joining…" : "Subscribe"}
          <ArrowRight className="size-4" />
        </button>
      </div>
      {errors.email && (
        <p id={`${emailId}-error`} role="alert" className={cn("mt-2 text-[0.8rem]", light ? "text-accent-soft" : "text-danger")}>
          {errors.email.message}
        </p>
      )}
      <label
        htmlFor={consentId}
        className={cn("mt-4 flex cursor-pointer items-start gap-3 text-[0.78rem] leading-relaxed", light ? "text-canvas/75" : "text-muted")}
      >
        <input id={consentId} type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]" {...register("consent")} />
        <span>I&apos;d like to receive emails about new collections and announcements. Unsubscribe anytime.</span>
      </label>
      {errors.consent && (
        <p role="alert" className={cn("mt-2 text-[0.8rem]", light ? "text-accent-soft" : "text-danger")}>
          {errors.consent.message}
        </p>
      )}
    </form>
  );
}
