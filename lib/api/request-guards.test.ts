import { afterEach, describe, expect, it } from "vitest";

import {
  MAX_QUESTION_LENGTH,
  consumeRateLimit,
  normalizeQuestion,
  resetRateLimitBuckets,
} from "./request-guards";

afterEach(() => {
  resetRateLimitBuckets();
});

describe("normalizeQuestion", () => {
  it("accepts a trimmed question", () => {
    expect(normalizeQuestion("  Hello  ")).toEqual({
      ok: true,
      question: "Hello",
    });
  });

  it("rejects empty / whitespace", () => {
    expect(normalizeQuestion("")).toMatchObject({ ok: false, status: 400 });
    expect(normalizeQuestion("   ")).toMatchObject({ ok: false, status: 400 });
    expect(normalizeQuestion(null)).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects questions over the max length", () => {
    const long = "a".repeat(MAX_QUESTION_LENGTH + 1);
    expect(normalizeQuestion(long)).toMatchObject({ ok: false, status: 400 });
  });

  it("accepts questions at the max length", () => {
    const max = "a".repeat(MAX_QUESTION_LENGTH);
    expect(normalizeQuestion(max)).toEqual({ ok: true, question: max });
  });
});

describe("consumeRateLimit", () => {
  it("allows requests under the limit", () => {
    const config = { limit: 2, windowMs: 60_000 };
    expect(consumeRateLimit("u1", config).ok).toBe(true);
    expect(consumeRateLimit("u1", config).ok).toBe(true);
  });

  it("blocks when the limit is exceeded", () => {
    const config = { limit: 1, windowMs: 60_000 };
    expect(consumeRateLimit("u2", config).ok).toBe(true);
    const blocked = consumeRateLimit("u2", config);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("resets after the window", () => {
    const config = { limit: 1, windowMs: 1000 };
    const now = 1_000_000;
    expect(consumeRateLimit("u3", config, now).ok).toBe(true);
    expect(consumeRateLimit("u3", config, now + 10).ok).toBe(false);
    expect(consumeRateLimit("u3", config, now + 1001).ok).toBe(true);
  });

  it("isolates keys", () => {
    const config = { limit: 1, windowMs: 60_000 };
    expect(consumeRateLimit("a", config).ok).toBe(true);
    expect(consumeRateLimit("b", config).ok).toBe(true);
  });
});
