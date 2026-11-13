"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { MessageSquareText, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, fieldAria, Input } from "@/components/ui/field";
import { sendJson } from "@/lib/api-client";
import type { SessionUser } from "@/lib/store";
import { cn } from "@/lib/utils";
import { phoneProfileSchema, phoneSchema } from "@/lib/validations";

/** "9876543210" → "+91 98765 43210". */
export const showPhone = (phone: string) => {
  const d = phone.replace(/\D/g, "").slice(-10);
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
};

/** Google's four-colour "G", as Google's sign-in button guidelines ask. */
export function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-5 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** Leaves for Google's account chooser; the server brings the shopper back to `next` signed in. */
export function GoogleButton({ next, link, label = "Continue with Google" }: { next?: () => string; link?: boolean; label?: string }) {
  const [leaving, setLeaving] = useState(false);
  return (
    <button
      type="button"
      disabled={leaving}
      onClick={() => {
        setLeaving(true);
        const params = new URLSearchParams(link ? { link: "1" } : { next: next?.() ?? "/account" });
        // A full page load: the API route sends the browser on to Google.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`/api/account/google?${params}`);
      }}
      className="flex h-14 w-full items-center justify-center gap-3 rounded-control border border-line-strong bg-raised px-5 text-md font-medium text-ink transition-colors hover:border-ink disabled:opacity-70"
    >
      {leaving ? <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-line-strong border-t-ink" /> : <GoogleMark />}
      {leaving ? "Opening Google…" : label}
    </button>
  );
}

export function OrDivider({ children = "or" }: { children?: React.ReactNode }) {
  return (
    <div className="my-7 flex items-center gap-4 text-xs uppercase tracking-[0.16em] text-muted" role="separator">
      <span className="h-px flex-1 bg-line" />
      {children}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

const RESEND_SECONDS = 30;

type Verified = { user: SessionUser } | { ticket: string };

/**
 * Mobile number → 6-digit SMS code. Calls `verifyUrl` with the number and code and hands the
 * response to `onVerified` (a signed-in user, or a ticket to finish a new account).
 */
export function PhoneVerify({
  verifyUrl,
  onVerified,
  submitLabel = "Send code",
  autoFocus,
}: {
  verifyUrl: "/api/account/phone/verify" | "/api/account/phone/link";
  onVerified: (result: Verified, phone: string) => void;
  submitLabel?: string;
  autoFocus?: boolean;
}) {
  const [phone, setPhone] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string>();
  const numberForm = useForm<z.input<typeof phoneSchema>, unknown, z.output<typeof phoneSchema>>({ resolver: zodResolver(phoneSchema) });

  async function send(number: string): Promise<string | null> {
    const res = await sendJson<{ devCode?: string }>("/api/account/phone/send", { phone: number });
    if (!res.ok) return res.error;
    setPhone(number);
    setDevCode(res.data.devCode);
    return null;
  }

  if (phone) {
    return (
      <CodeStep
        phone={phone}
        devCode={devCode}
        onResend={() => send(phone)}
        onChangeNumber={() => setPhone(null)}
        verify={async (code) => {
          const res = await sendJson<Verified>(verifyUrl, { phone, code });
          if (!res.ok) return res.error;
          onVerified(res.data, phone);
          return null;
        }}
      />
    );
  }

  const error = numberForm.formState.errors.phone?.message;
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={numberForm.handleSubmit(async ({ phone: number }) => {
        const failed = await send(number);
        if (failed) numberForm.setError("phone", { message: failed });
      })}
    >
      <Field label="Mobile number" htmlFor="phone" error={error} hint="We'll text you a 6-digit code. No password needed.">
        <div className="relative">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-md text-muted">
            +91
          </span>
          <Input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            maxLength={14}
            autoFocus={autoFocus}
            className="pl-14 text-base tracking-wide"
            {...fieldAria("phone", error, true)}
            {...numberForm.register("phone")}
          />
        </div>
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={numberForm.formState.isSubmitting}>
        <MessageSquareText /> {submitLabel}
      </Button>
    </form>
  );
}

function CodeStep({
  phone,
  devCode,
  onResend,
  onChangeNumber,
  verify,
}: {
  phone: string;
  devCode?: string;
  onResend: () => Promise<string | null>;
  onChangeNumber: () => void;
  verify: (code: string) => Promise<string | null>;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_SECONDS * 1000);
  const input = useRef<HTMLInputElement>(null);
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    if (wait === 0) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [wait]);

  async function submit(value: string) {
    if (busy) return;
    if (!/^\d{6}$/.test(value)) {
      setError("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    setError(undefined);
    const failed = await verify(value);
    setBusy(false);
    if (failed) {
      setError(failed);
      setCode("");
      input.current?.focus();
    }
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(code);
      }}
    >
      <div className="flex items-start justify-between gap-3 rounded-card bg-surface px-4 py-3.5 text-md">
        <p className="text-muted">
          Code sent to <span className="whitespace-nowrap font-medium text-ink">{showPhone(phone)}</span>
        </p>
        <button type="button" onClick={onChangeNumber} className="inline-flex shrink-0 items-center gap-1 font-medium text-brand hover:text-brand-deep">
          <PencilLine className="size-3.5" /> Change
        </button>
      </div>

      <Field label="6-digit code" htmlFor="otp" error={error}>
        <Input
          ref={input}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(value);
            setError(undefined);
            // Typed or pasted the whole code (or picked it from the SMS suggestion): check it straight away.
            if (value.length === 6) void submit(value);
          }}
          className="h-14 text-center text-2xl tracking-[0.5em] placeholder:tracking-[0.5em]"
          {...fieldAria("otp", error)}
        />
      </Field>

      {devCode && (
        <p className="rounded-control border border-dashed border-line-strong px-4 py-3 text-sm text-muted">
          Test mode — SMS isn&apos;t set up yet, so here&apos;s your code: <span className="font-medium tracking-[0.2em] text-ink">{devCode}</span>
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" loading={busy}>
        Verify &amp; continue
      </Button>

      <p className="text-center text-sm text-muted">
        Didn&apos;t get it?{" "}
        {wait > 0 ? (
          <span className="tabular-nums">Resend in 0:{String(wait).padStart(2, "0")}</span>
        ) : (
          <button
            type="button"
            className="font-medium text-ink underline underline-offset-4"
            onClick={async () => {
              const failed = await onResend();
              setNow(Date.now());
              if (!failed) setResendAt(Date.now() + RESEND_SECONDS * 1000);
              setError(failed ?? undefined);
              setCode("");
            }}
          >
            Resend code
          </button>
        )}
      </p>
    </form>
  );
}

/** Phone sign-in for the sign-in page: verify the number, then (new number only) name and email. */
export function PhoneSignIn({ onSignedIn, autoFocus }: { onSignedIn: (user: SessionUser, isNew: boolean) => void; autoFocus?: boolean }) {
  const [ticket, setTicket] = useState<{ ticket: string; phone: string } | null>(null);
  const [expired, setExpired] = useState(false);

  if (ticket) {
    return (
      <NewPhoneAccount
        {...ticket}
        onDone={(user) => onSignedIn(user, true)}
        onExpired={() => {
          setTicket(null);
          setExpired(true);
        }}
      />
    );
  }
  return (
    <>
      {expired && (
        <p role="alert" className="mb-5 rounded-control bg-surface px-4 py-3 text-sm text-ink">
          That took a little long — please verify your number again.
        </p>
      )}
      <PhoneVerify
        autoFocus={autoFocus}
        verifyUrl="/api/account/phone/verify"
        onVerified={(result, phone) => {
          if ("user" in result) onSignedIn(result.user, false);
          else setTicket({ ticket: result.ticket, phone });
        }}
      />
    </>
  );
}

function NewPhoneAccount({
  ticket,
  phone,
  onDone,
  onExpired,
}: {
  ticket: string;
  phone: string;
  onDone: (user: SessionUser) => void;
  onExpired: () => void;
}) {
  const form = useForm<z.input<typeof phoneProfileSchema>>({
    resolver: zodResolver(phoneProfileSchema),
    defaultValues: { ticket, name: "", email: "" },
    mode: "onTouched",
  });
  const e = form.formState.errors;
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={form.handleSubmit(async (values) => {
        const res = await sendJson<{ user: SessionUser }>("/api/account/phone/complete", values);
        if (res.ok) return onDone(res.data.user);
        if (res.status === 410) return onExpired();
        form.setError(res.status === 409 ? "email" : "name", { message: res.error });
      })}
    >
      <div className="rounded-card bg-accent-soft/60 px-4 py-3.5 text-md">
        <p className="font-medium text-ink">{showPhone(phone)} is verified</p>
        <p className="mt-0.5 text-muted">You&apos;re new here — just two details to finish your account.</p>
      </div>
      <Field label="Full name" htmlFor="pn-name" error={e.name?.message}>
        <Input autoComplete="name" autoFocus {...fieldAria("pn-name", e.name?.message)} {...form.register("name")} />
      </Field>
      <Field label="Email" htmlFor="pn-email" error={e.email?.message} hint={e.email ? undefined : "For order updates and receipts."}>
        <Input type="email" autoComplete="email" {...fieldAria("pn-email", e.email?.message, true)} {...form.register("email")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Create my account
      </Button>
    </form>
  );
}

/** Two-way switch between ways to sign in. */
export function MethodTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon: React.ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" aria-label="Sign in with" className="mb-6 grid grid-cols-2 gap-1 rounded-control bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-chip text-md font-medium transition-colors [&_svg]:size-4",
            value === o.value ? "bg-raised text-ink shadow-[0_1px_3px_rgb(34_41_35/0.12)]" : "text-muted hover:text-ink",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
