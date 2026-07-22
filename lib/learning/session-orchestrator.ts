import { getCachedLesson, saveLessonToCache } from "@/lib/cache";

import { applyCorrectedPanels } from "./apply-corrected-panels";
import { generateCharacterBible } from "./character-bible";
import { generateComicPlan } from "./comic-planner";
import { renderComic } from "./comic-renderer";
import { extractConcepts } from "./concept-extractor";
import { generateImagePrompts } from "./image-prompt-generator";
import { validateLearning } from "./learning-validator";
import { planLearning } from "./planner";
import { generateQuiz } from "./quiz-generator";
import {
  ComicRenderIncompleteError,
  summarizeRenderFailures,
} from "./render-failures";
import { generateRoadmap } from "./roadmap-generator";
import { buildScenes } from "./scene-consistency";
import { generateStory } from "./story-generator";
import {
  LEARNING_STYLE,
  type ComicPlan,
  type LearningSession,
  type LearningStyle,
  type ValidationResult,
} from "./types";

export class LearningSessionValidationError extends Error {
  readonly validation: ValidationResult;

  constructor(validation: ValidationResult) {
    super(
      `Learning validation failed (score: ${validation.score}). ${
        validation.feedback[0] ?? "The lesson did not pass validation."
      }`,
    );
    this.name = "LearningSessionValidationError";
    this.validation = validation;
  }
}

export type RunLearningSessionOptions = {
  /** Skip cache read/write. */
  bypassCache?: boolean;
  /**
   * When true (default), throw if every panel image failed.
   * Partial failures still return a session; callers should inspect renderedComic.panels[].error.
   */
  failIfAllImagesFailed?: boolean;
};

function comicOnlyLearningStyle(topic: string): LearningStyle {
  return {
    selectedStyle: LEARNING_STYLE,
    confidence: 100,
    reason: `Product currently ships comic lessons only for "${topic}".`,
    alternatives: ["story", "diagram", "quiz"],
  };
}

function isLearningSession(value: unknown): value is LearningSession {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return Boolean(
    data.learningPlan &&
      data.story &&
      data.comicPlan &&
      data.renderedComic &&
      data.quiz &&
      data.imagePrompts,
  );
}

async function runStep<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();

  try {
    const result = await fn();
    console.log(`[learning-session] ${name} completed in ${Date.now() - startedAt}ms`);
    return result;
  } catch (error) {
    const elapsed = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[learning-session] ${name} failed after ${elapsed}ms: ${message}`);
    throw new Error(`Learning session failed at "${name}": ${message}`);
  }
}

/**
 * Validate once; if invalid and corrections exist, apply them and re-validate once.
 * Throws LearningSessionValidationError if still invalid after that.
 */
async function validateWithCorrectionPass(
  learningPlan: LearningSession["learningPlan"],
  story: LearningSession["story"],
  comicPlan: ComicPlan,
): Promise<{ comicPlan: ComicPlan; validation: ValidationResult }> {
  let workingPlan = comicPlan;

  let validation = await runStep("Learning Validator", () =>
    validateLearning(learningPlan, story, workingPlan),
  );

  if (validation.isValid) {
    return { comicPlan: workingPlan, validation };
  }

  if (validation.correctedPanels.length > 0) {
    workingPlan = applyCorrectedPanels(workingPlan, validation.correctedPanels);
    console.log(
      `[learning-session] Applied ${validation.correctedPanels.length} corrected panel(s); re-validating`,
    );

    validation = await runStep("Learning Validator (retry)", () =>
      validateLearning(learningPlan, story, workingPlan),
    );
  }

  if (!validation.isValid) {
    throw new LearningSessionValidationError(validation);
  }

  return { comicPlan: workingPlan, validation };
}

export async function runLearningSession(
  question: string,
  options: RunLearningSessionOptions = {},
): Promise<LearningSession> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Question is required");
  }

  const bypassCache = options.bypassCache === true;
  const failIfAllImagesFailed = options.failIfAllImagesFailed !== false;

  if (!bypassCache) {
    const cached = await getCachedLesson(trimmed, LEARNING_STYLE);
    if (cached.cacheHit && isLearningSession(cached.assets)) {
      console.log(`[learning-session] Cache hit ${cached.lessonId}`);
      return cached.assets;
    }
  }

  // Independent LLM calls — run in parallel (M5).
  const [learningPlan, concepts] = await Promise.all([
    runStep("Learning Planner", () => planLearning({ question: trimmed })),
    runStep("Concept Extractor", () => extractConcepts(trimmed)),
  ]);

  const learningStyle = comicOnlyLearningStyle(learningPlan.topic);

  const story = await runStep("Story Generator", () => generateStory(learningPlan));

  // Both only need the story.
  const [characterBible, initialComicPlan] = await Promise.all([
    runStep("Character Bible", () => generateCharacterBible(story)),
    runStep("Comic Planner", () => generateComicPlan(story)),
  ]);

  const { comicPlan, validation } = await validateWithCorrectionPass(
    learningPlan,
    story,
    initialComicPlan,
  );

  // Quiz + roadmap do not depend on images — overlap with scene/image work.
  const scenePlanPromise = runStep("Scene Consistency Engine", () =>
    buildScenes(characterBible, comicPlan),
  );
  const quizPromise = runStep("Quiz Generator", () =>
    generateQuiz({
      plan: learningPlan,
      story,
      comicPlan,
    }),
  );
  const roadmapPromise = runStep("Roadmap Generator", () =>
    generateRoadmap({
      currentLesson: {
        topic: learningPlan.topic,
        title: story.title,
      },
      concepts,
    }),
  );

  const scenePlan = await scenePlanPromise;

  const imagePrompts = await runStep("Image Prompt Generator", () =>
    generateImagePrompts(comicPlan, { scenePlan, characterBible }),
  );

  const [renderedComic, quiz, roadmap] = await Promise.all([
    runStep("Comic Renderer", () =>
      renderComic(imagePrompts, {
        title: story.title,
        comicPlan,
      }),
    ),
    quizPromise,
    roadmapPromise,
  ]);

  const renderSummary = summarizeRenderFailures(renderedComic);
  if (renderSummary.someFailed) {
    console.warn(
      `[learning-session] ${renderSummary.failedCount}/${renderSummary.totalCount} panel image(s) failed`,
    );
  }
  if (failIfAllImagesFailed && renderSummary.allFailed) {
    throw new ComicRenderIncompleteError(renderedComic, renderSummary);
  }

  const session: LearningSession = {
    learningPlan,
    concepts,
    learningStyle,
    story,
    characterBible,
    comicPlan,
    validation,
    imagePrompts,
    renderedComic,
    quiz,
    roadmap,
  };

  if (!bypassCache) {
    try {
      await saveLessonToCache({
        question: trimmed,
        style: LEARNING_STYLE,
        assets: session,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[learning-session] Failed to write lesson cache: ${message}`);
    }
  }

  return session;
}
