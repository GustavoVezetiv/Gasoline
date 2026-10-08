const buckets = new Map<string, { count: number; resetAt: number }>()

// A lightweight per-instance guard for a small private group. Provider quotas remain the hard limit.
export function allowRequest(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  for (const [id, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(id)
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    if (buckets.size >= 10000) return false
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (current.count >= limit) return false
  current.count += 1
  return true
}

export function resetRateLimits() { buckets.clear() }
