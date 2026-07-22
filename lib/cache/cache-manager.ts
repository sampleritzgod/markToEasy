import { createHash } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

import type { LearningStyleId } from "@/lib/learning/types";

import type {
  CachedLessonRecord,
  CacheLookupResult,
  LessonToCache,
} from "./types";

const DEFAULT_CACHE_DIR = ".cache/lessons";

function getCacheDir(): string {
  return process.env.LESSON_CACHE_DIR?.trim() || DEFAULT_CACHE_DIR;
}

function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Deterministic cache key from question + learning style. */
export function buildLessonCacheKey(
  question: string,
  style: LearningStyleId,
): string {
  const payload = `${normalizeQuestion(question)}::${style}`;
  return createHash("sha256").update(payload).digest("hex");
}

function cacheFilePath(lessonId: string): string {
  return path.resolve(process.cwd(), getCacheDir(), `${lessonId}.json`);
}

async function ensureCacheDir(): Promise<void> {
  await mkdir(path.resolve(process.cwd(), getCacheDir()), { recursive: true });
}

function emptyMiss(): CacheLookupResult {
  return {
    cacheHit: false,
    lessonId: "",
    assets: {},
  };
}

export async function getCachedLesson(
  question: string,
  style: LearningStyleId,
): Promise<CacheLookupResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Question is required");
  }
  if (!style) {
    throw new Error("Learning style is required");
  }

  const lessonId = buildLessonCacheKey(trimmed, style);

  try {
    const raw = await readFile(cacheFilePath(lessonId), "utf8");
    const record = JSON.parse(raw) as CachedLessonRecord;

    if (!record?.assets || record.lessonId !== lessonId) {
      return emptyMiss();
    }

    return {
      cacheHit: true,
      lessonId,
      assets: record.assets,
    };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (code === "ENOENT") {
      return emptyMiss();
    }

    // Corrupt/unreadable entries count as a miss so the pipeline can regenerate.
    if (error instanceof SyntaxError) {
      return emptyMiss();
    }

    throw error;
  }
}

export async function saveLessonToCache(
  lesson: LessonToCache,
): Promise<CacheLookupResult> {
  const question = lesson.question.trim();
  if (!question) {
    throw new Error("Question is required");
  }
  if (!lesson.style) {
    throw new Error("Learning style is required");
  }
  if (!lesson.assets) {
    throw new Error("Lesson assets are required");
  }

  const lessonId = buildLessonCacheKey(question, lesson.style);
  const record: CachedLessonRecord = {
    lessonId,
    question,
    style: lesson.style,
    createdAt: new Date().toISOString(),
    assets: lesson.assets,
  };

  await ensureCacheDir();
  await writeFile(cacheFilePath(lessonId), JSON.stringify(record, null, 2), "utf8");

  return {
    cacheHit: true,
    lessonId,
    assets: record.assets,
  };
}

export async function invalidateCachedLesson(
  question: string,
  style: LearningStyleId,
): Promise<boolean> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Question is required");
  }

  const lessonId = buildLessonCacheKey(trimmed, style);

  try {
    await rm(cacheFilePath(lessonId));
    return true;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

export async function invalidateLessonById(lessonId: string): Promise<boolean> {
  const id = lessonId.trim();
  if (!id) {
    throw new Error("Lesson id is required");
  }

  try {
    await rm(cacheFilePath(id));
    return true;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";

    if (code === "ENOENT") {
      return false;
    }

    throw error;
  }
}
