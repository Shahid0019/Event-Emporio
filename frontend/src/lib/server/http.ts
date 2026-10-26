import { NextResponse } from "next/server";
import type { z } from "zod";
import type { Account } from "./accounts";

/** Small helpers for JSON route handlers. */
export const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status, headers: { "Cache-Control": "no-store" } });

export const ok = (data: unknown) => NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });

/** Parses and validates a JSON body; returns the first validation message on failure. */
export async function readBody<S extends z.ZodType>(request: Request, schema: S): Promise<{ data: z.output<S> } | { error: string }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Invalid request" };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  return { data: parsed.data };
}

/** What the browser may keep about the signed-in customer (for the header and form prefill). */
export const publicUser = (a: Account) => ({ name: a.name, email: a.email, ...(a.phone && { phone: a.phone }) });
