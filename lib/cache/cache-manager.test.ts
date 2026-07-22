import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";

import {
  buildLessonCacheKey,
  getCachedLesson,
  invalidateCachedLesson,
  saveLessonToCache,
} from "./cache-manager";
import type { LearningSession } from "@/lib/learning/types";

const minimalAssets = {
  learningPlan: {
    topic: "DNS",
    difficulty: "beginner",
    concepts: ["A"],
    analogy: "phone book",
    learningStyle: "comic",
  },
} as unknown as LearningSession;

describe("buildLessonCacheKey", () => {
  it("is deterministic for same question+style", () => {
    expect(buildLessonCacheKey("What is DNS?", "comic")).toBe(
      buildLessonCacheKey("What is DNS?", "comic"),
    );
  });

  it("normalizes whitespace and case", () => {
    expect(buildLessonCacheKey("  What   is DNS?  ", "comic")).toBe(
      buildLessonCacheKey("what is dns?", "comic"),
    );
  });

  it("differs by style", () => {
    expect(buildLessonCacheKey("DNS", "comic")).not.toBe(
      buildLessonCacheKey("DNS", "quiz"),
    );
  });
});

describe("lesson cache disk operations", () => {
  let cacheDir: string;
  let previous: string | undefined;

  beforeEach(async () => {
    cacheDir = await mkdtemp(path.join(os.tmpdir(), "mte-cache-"));
    previous = process.env.LESSON_CACHE_DIR;
    process.env.LESSON_CACHE_DIR = cacheDir;
  });

  afterEach(async () => {
    if (previous === undefined) {
      delete process.env.LESSON_CACHE_DIR;
    } else {
      process.env.LESSON_CACHE_DIR = previous;
    }
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("misses when nothing cached", async () => {
    const result = await getCachedLesson("What is DNS?", "comic");
    expect(result.cacheHit).toBe(false);
  });

  it("saves and hits", async () => {
    await saveLessonToCache({
      question: "What is DNS?",
      style: "comic",
      assets: minimalAssets,
    });

    const result = await getCachedLesson("What is DNS?", "comic");
    expect(result.cacheHit).toBe(true);
    expect(result.assets).toEqual(minimalAssets);
  });

  it("invalidates a cached lesson", async () => {
    await saveLessonToCache({
      question: "What is DNS?",
      style: "comic",
      assets: minimalAssets,
    });
    expect(await invalidateCachedLesson("What is DNS?", "comic")).toBe(true);
    expect((await getCachedLesson("What is DNS?", "comic")).cacheHit).toBe(
      false,
    );
  });

  it("rejects empty question", async () => {
    await expect(getCachedLesson("   ", "comic")).rejects.toThrow(
      /Question is required/,
    );
  });
});
