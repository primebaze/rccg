/**
 * Minimal in-memory rate limiter.
 *
 * Good enough for low-traffic, single-instance deployments. State lives in the
 * Node process, so it resets on redeploy and is NOT shared across multiple
 * serverless instances. For durable, multi-instance limiting swap this for a
 * Redis-backed limiter (e.g. Upstash).
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map can't grow without bound.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * Records a hit for `key` and reports whether it is within `limit` per
 * `windowSeconds`. Uses a fixed window per key.
 */
export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const windowMs = windowSeconds * 1000;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  if (existing.count > limit) {
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  return { ok: true, remaining: limit - existing.count, retryAfterSeconds };
}

/** Clears any recorded hits for a key (e.g. after a successful login). */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Best-effort client IP from common proxy headers, falling back to a constant. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Standard 429 JSON response with a Retry-After header. */
export function tooManyRequests(retryAfterSeconds: number, message?: string) {
  return new Response(
    JSON.stringify({ message: message ?? "Too many requests. Please slow down and try again shortly." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds)
      }
    }
  );
}
