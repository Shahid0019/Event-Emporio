"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { adminSignIn, type AdminLoginState } from "@/app/(auth)/admin-login/actions";
import { AuthHeading, PasswordInput } from "./auth-forms";

/** Sign-in for the admin dashboard; credentials are checked on the server. */
export function AdminLoginForm() {
  const next = useSearchParams().get("next") ?? "/admin";
  const [state, action, pending] = useActionState<AdminLoginState, FormData>(adminSignIn, {});

  return (
    <>
      <AuthHeading eyebrow="Admin" title="Sign in to the dashboard">
        For Events Emporio staff only.
      </AuthHeading>
      <form action={action} aria-label="Admin sign in" className="space-y-5">
        <input type="hidden" name="next" value={next} />
        <Field label="Email" htmlFor="admin-email">
          <Input id="admin-email" name="email" type="email" autoComplete="username" required defaultValue={state.email} />
        </Field>
        <Field label="Password" htmlFor="admin-password" error={state.error}>
          <PasswordInput id="admin-password" name="password" autoComplete="current-password" required error={state.error} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Sign in
        </Button>
      </form>
    </>
  );
}
