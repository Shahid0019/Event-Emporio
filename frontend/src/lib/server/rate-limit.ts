/**
 * Simple in-memory rate limiter for sign-in, sign-up and form posts.
 * Per server process — enough to slow down guessing on a single server;
 * use a shared store (e.g. Upstash Redis) when running several instances.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// The e2e test server sends every request from one address; give it room (never in production).
const scale = process.env.E2E === "1" && process.env.NODE_ENV !== "production" ? 100 : 1;

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    return { ok: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  return { ok: bucket.count <= limit * scale, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
}

/** Best-effort client address for rate-limit keys. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}
