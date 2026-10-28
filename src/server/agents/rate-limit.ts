const buckets = new Map<string, {count: number; resetAt: number}>();

/**
 * Best-effort per-user throttle for the assistant route. A multi-instance
 * deployment should move this to a shared store; it still protects a single
 * process from accidental loops and runaway spend.
 */
export function allowAssistantRequest(
  key: string,
  limit = 30,
  windowMs = 10 * 60 * 1000,
): boolean {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {count: 1, resetAt: now + windowMs});
    return true;
  }

  if (current.count >= limit) return false;

  current.count += 1;
  return true;
}
