import type { LearningSession, LearningStyleId } from "@/lib/learning/types";

export type CachedLessonAssets = LearningSession;

export type CacheLookupResult = {
  cacheHit: boolean;
  lessonId: string;
  assets: CachedLessonAssets | Record<string, never>;
};

export type LessonToCache = {
  question: string;
  style: LearningStyleId;
  assets: CachedLessonAssets;
};

export type CachedLessonRecord = {
  lessonId: string;
  question: string;
  style: LearningStyleId;
  createdAt: string;
  assets: CachedLessonAssets;
};
