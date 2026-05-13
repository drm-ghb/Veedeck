/**
 * Simple in-memory rate limiter.
 *
 * NOTE: This works correctly on a single-instance server (local dev, single
 * container). On Vercel's multi-instance serverless deployment the counter
 * resets per cold start and is not shared across instances. For production
 * multi-instance environments replace with Upstash Rate Limit:
 * https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

/**
 * Returns true if the request is allowed, false if the limit has been hit.
 *
 * @param key    Unique identifier (e.g. "register:1.2.3.4")
 * @param max    Maximum allowed requests within the window
 * @param windowMs  Window duration in milliseconds (default: 60 000)
 */
export function rateLimit(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;

  entry.count++;
  return true;
}

/** Extract the caller's IP address from a Next.js request */
export function getClientIp(req: Request): string {
  return (
    (req.headers as Headers).get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
