import { AppError } from './api'

type Bucket = { count: number; resetAt: number }

/**
 * In-memory fixed-window rate limiter — zero dependencies, good enough for a
 * single Node process. For multi-instance deployments swap the Map for Redis
 * or Upstash; the `limit()` signature stays the same.
 */
const buckets = new Map<string, Bucket>()

export function limit(key: string, max: number, windowMs: number) {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  if (bucket.count >= max) {
    const seconds = Math.ceil((bucket.resetAt - now) / 1000)
    throw new AppError(`Too many requests. Please try again in ${seconds}s.`, 429)
  }
  bucket.count += 1
}

/** Best-effort client identifier from proxy headers. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// Periodically drop expired buckets so the Map cannot grow without bound.
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key)
  }, 60_000)
  // Do not keep the Node process alive just for cleanup.
  if (typeof timer.unref === 'function') timer.unref()
}
