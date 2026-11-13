"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Eye, EyeOff, Mail, MailCheck, Smartphone } from "lucide-react";
import { GoogleButton, MethodTabs, OrDivider, PhoneSignIn } from "@/components/auth/quick-sign-in";
import { Button } from "@/components/ui/button";
import { Field, fieldAria, Input } from "@/components/ui/field";
import { sendJson } from "@/lib/api-client";
import { signIn, type SessionUser } from "@/lib/store";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validations";

/** Which quick sign-in options the server has set up. */
export interface SignInOptions {
  google: boolean;
  phone: boolean;
}

/** The page's query string, read after hydration (empty while prerendering). */
const useSearch = () =>
  new URLSearchParams(
    useSyncExternalStore(
      () => () => undefined,
      () => window.location.search,
      () => "",
    ),
  );

/** Why a trip to Google came back without signing in (?google=…). */
const googleProblems: Record<string, string> = {
  setup: "Google sign-in isn't set up yet. Use your mobile number or email for now.",
  cancelled: "Google sign-in was cancelled. Choose an account to continue, or use another way below.",
  failed: "We couldn't sign you in with Google. Please try again.",
  email: "This email already has an account. Sign in with your password, then connect Google under My account.",
};

/** Only allow same-site relative redirects (prevents open-redirects via ?next=). */
function safeNext(fallback = "/account") {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

/** Sign in ↔ create account, keeping where the shopper was heading (e.g. back to write a review). */
function SwitchLink({ href, children }: { href: "/login" | "/register"; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        const next = safeNext("");
        if (!next) return;
        e.preventDefault();
        router.push(`${href}?next=${encodeURIComponent(next)}`);
      }}
      className="text-ink underline underline-offset-4"
    >
      {children}
    </Link>
  );
}

export function PasswordInput({ id, error, autoComplete, ...props }: React.ComponentProps<"input"> & { id: string; error?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} autoComplete={autoComplete} className="pr-12" {...fieldAria(id, error)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-muted hover:text-ink"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function AuthHeading({ eyebrow, title, children }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-10">
      <p className="eyebrow text-accent-ink">{eyebrow}</p>
      <h1 className="mt-4 text-h2">{title}</h1>
      {children && <p className="mt-4 leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

function GoogleProblem() {
  const problem = googleProblems[useSearch().get("google") ?? ""];
  if (!problem) return null;
  return (
    <p role="alert" className="mb-6 rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-ink">
      {problem}
    </p>
  );
}

/* --------------------------------- Login -------------------------------- */
export function LoginForm({ google, phone }: SignInOptions) {
  const router = useRouter();
  const asked = useSearch().get("method");
  const [method, setMethod] = useState<"phone" | "email" | null>(null);
  const current = phone ? (method ?? (asked === "email" ? "email" : "phone")) : "email";

  const done = (user: SessionUser, isNew = false) => {
    signIn(user);
    if (isNew) toast.success("Your account is ready", { description: "Welcome to Khandr." });
    else toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
    router.replace(safeNext());
  };

  return (
    <>
      <AuthHeading
        eyebrow="Welcome"
        title={
          <>
            Sign <em className="text-brand">in</em>
          </>
        }
      >
        Track orders, keep your function plans and check out faster.
      </AuthHeading>
      <GoogleProblem />
      {google && (
        <>
          <GoogleButton next={() => safeNext()} />
          <OrDivider />
        </>
      )}
      {phone && (
        <MethodTabs
          value={current}
          onChange={setMethod}
          options={[
            { value: "phone", label: "Mobile number", icon: <Smartphone /> },
            { value: "email", label: "Email", icon: <Mail /> },
          ]}
        />
      )}
      {current === "phone" ? (
        <>
          <PhoneSignIn autoFocus={method === "phone"} onSignedIn={done} />
          <p className="mt-8 text-center text-md text-muted">New here? Your account is made as soon as your number is verified.</p>
        </>
      ) : (
        <EmailSignIn onSignedIn={done} />
      )}
    </>
  );
}

function EmailSignIn({ onSignedIn }: { onSignedIn: (user: SessionUser) => void }) {
  const { register, handleSubmit, formState, setError } = useForm<z.input<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    const res = await sendJson<{ user: SessionUser }>("/api/account/login", values);
    if (!res.ok) {
      setError("password", { message: res.error });
      return;
    }
    onSignedIn(res.data.user);
  });

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...fieldAria("email", errors.email?.message)} {...register("email")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <PasswordInput id="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
      <p className="mt-8 text-center text-md text-muted">
        New to Khandr? <SwitchLink href="/register">Create an account</SwitchLink>
      </p>
    </>
  );
}

/* -------------------------------- Register ------------------------------ */
export function RegisterForm({ google, phone }: SignInOptions) {
  const router = useRouter();
  const asked = useSearch().get("method");
  const [method, setMethod] = useState<"phone" | "email" | null>(null);
  // Mobile number first; email stays one tap away.
  const current = phone ? (method ?? (asked === "email" ? "email" : "phone")) : "email";

  const done = (user: SessionUser, isNew = true) => {
    signIn(user);
    if (isNew) toast.success("Your account is ready", { description: "Welcome to Khandr." });
    else
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`, {
        description: "This number already had an account, so we signed you in.",
      });
    router.replace(safeNext());
  };

  return (
    <>
      <AuthHeading
        eyebrow="Join us"
        title={
          <>
            Create an <em className="text-brand">account</em>
          </>
        }
      >
        Track orders, save addresses and keep a wishlist across visits.
      </AuthHeading>
      <GoogleProblem />
      {google && (
        <>
          <GoogleButton label="Sign up with Google" next={() => safeNext()} />
          <OrDivider />
        </>
      )}
      {phone && (
        <MethodTabs
          value={current}
          onChange={setMethod}
          options={[
            { value: "phone", label: "Mobile number", icon: <Smartphone /> },
            { value: "email", label: "Email", icon: <Mail /> },
          ]}
        />
      )}
      {current === "phone" ? <PhoneSignIn autoFocus={method === "phone"} onSignedIn={done} /> : <EmailRegister onRegistered={done} />}
      <p className="mt-8 text-center text-md text-muted">
        Already have an account? <SwitchLink href="/login">Sign in</SwitchLink>
      </p>
    </>
  );
}

function EmailRegister({ onRegistered }: { onRegistered: (user: SessionUser) => void }) {
  const { register, handleSubmit, formState, setError } = useForm<z.input<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
  });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    const res = await sendJson<{ user: SessionUser }>("/api/account/register", values);
    if (!res.ok) {
      setError(res.status === 409 ? "email" : "password", { message: res.error });
      return;
    }
    onRegistered(res.data.user);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field label="Full name" htmlFor="name" error={errors.name?.message}>
        <Input autoComplete="name" {...fieldAria("name", errors.name?.message)} {...register("name")} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...fieldAria("email", errors.email?.message)} {...register("email")} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message} hint="At least 8 characters, with a letter and a number">
        <PasswordInput id="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Create account
      </Button>
    </form>
  );
}

/* ----------------------------- Forgot password -------------------------- */
export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { register, handleSubmit, formState, setError } = useForm<z.input<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
  });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    const res = await sendJson("/api/account/password/forgot", values);
    if (!res.ok) {
      setError("email", { message: res.error });
      return;
    }
    setSentTo(values.email);
  });

  if (sentTo) {
    return (
      <div className="text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-surface text-brand">
          <MailCheck className="size-7 stroke-[1.5]" />
        </span>
        <h1 className="mt-8 text-h2">Check your inbox</h1>
        {/* Same message whether or not the account exists — avoids revealing registered emails. */}
        <p className="mt-4 leading-relaxed text-muted">
          If an account exists for <span className="text-ink">{sentTo}</span>, you&apos;ll receive a link to reset your password shortly.
        </p>
        <Link href="/login" className="mt-10 inline-block text-xs font-medium uppercase tracking-[0.16em] link-underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <AuthHeading eyebrow="Account help" title="Reset your password">
        Enter the email you used to register and we&apos;ll send you a reset link.
      </AuthHeading>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" {...fieldAria("email", errors.email?.message)} {...register("email")} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
      <p className="mt-8 text-center text-md text-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </>
  );
}

/* ------------------------------ Reset password -------------------------- */
export function ResetPasswordForm() {
  const router = useRouter();
  const { register, handleSubmit, formState, setError } = useForm<z.input<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
  });
  const { errors, isSubmitting } = formState;

  const onSubmit = handleSubmit(async (values) => {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    const res = await sendJson("/api/account/password/reset", { ...values, token });
    if (!res.ok) {
      setError("password", { message: res.error });
      return;
    }
    toast.success("Password updated", { description: "You can now sign in with your new password." });
    router.replace("/login");
  });

  return (
    <>
      <AuthHeading eyebrow="Account help" title="Choose a new password" />
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Field
          label="New password"
          htmlFor="password"
          error={errors.password?.message}
          hint="At least 8 characters, with a letter and a number"
        >
          <PasswordInput id="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </>
  );
}
