/**
 * Shared request guards for paid inference routes.
 * In-memory rate limits are per-process (fine for single instance; use Redis in multi-instance prod).
 */

export const MAX_QUESTION_LENGTH = 4000;

export type RateLimitConfig = {
  /** Max requests allowed in the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export const CHAT_RATE_LIMIT: RateLimitConfig = {
  limit: 30,
  windowMs: 15 * 60 * 1000,
};

export const LEARNING_RATE_LIMIT: RateLimitConfig = {
  limit: 5,
  windowMs: 60 * 60 * 1000,
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function normalizeQuestion(
  raw: string | undefined | null,
): { ok: true; question: string } | { ok: false; error: string; status: number } {
  if (typeof raw !== "string") {
    return { ok: false, error: "Question is required", status: 400 };
  }

  const question = raw.trim();
  if (!question) {
    return { ok: false, error: "Question is required", status: 400 };
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      error: `Question must be at most ${MAX_QUESTION_LENGTH} characters`,
      status: 400,
    };
  }

  return { ok: true, question };
}

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number; retryAfterSec: number };

/** Check-and-increment a rate-limit bucket for `key`. */
export function consumeRateLimit(
  key: string,
  config: RateLimitConfig,
  now = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + config.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: config.limit - 1, resetAt };
  }

  if (existing.count >= config.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSec,
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    ok: true,
    remaining: config.limit - existing.count,
    resetAt: existing.resetAt,
  };
}

/** Test helper — clears all buckets. */
export function resetRateLimitBuckets(): void {
  buckets.clear();
}

export function rateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): HeadersInit {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(config.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.ok) {
    headers["Retry-After"] = String(result.retryAfterSec);
  }

  return headers;
}
