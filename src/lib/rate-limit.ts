/**
 * Fixed-window in-memory limiter. On serverless each instance has its own
 * counters, so this is best-effort abuse protection; the 40-bit tracking
 * numbers make enumeration impractical even when the limit is bypassed.
 * Swap `hit` for Redis/Upstash for strict global limits.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function hit(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
  let b = buckets.get(key);
  if (!b || b.reset <= now) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.count++;
  return { allowed: b.count <= limit, retryAfterSec: Math.max(1, Math.ceil((b.reset - now) / 1000)) };
}

export function clearBucket(key: string) {
  buckets.delete(key);
}

export function resetRateLimits() {
  buckets.clear();
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
