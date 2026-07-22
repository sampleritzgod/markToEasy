import { generateCharacterBible } from "./character-bible";
import { generateComicPlan } from "./comic-planner";
import { renderComic } from "./comic-renderer";
import { extractConcepts } from "./concept-extractor";
import { generateImagePrompts } from "./image-prompt-generator";
import { validateLearning } from "./learning-validator";
import { planLearning } from "./planner";
import { generateQuiz } from "./quiz-generator";
import { buildScenes } from "./scene-consistency";
import { generateStory } from "./story-generator";
import { selectLearningStyle } from "./style-router";
import type { LearningSession, ValidationResult } from "./types";

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

export async function runLearningSession(question: string): Promise<LearningSession> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Question is required");
  }

  const learningPlan = await runStep("Learning Planner", () =>
    planLearning({ question: trimmed }),
  );

  const concepts = await runStep("Concept Extractor", () => extractConcepts(trimmed));

  const learningStyle = await runStep("Learning Style Router", () =>
    selectLearningStyle(trimmed, learningPlan),
  );

  const story = await runStep("Story Generator", () => generateStory(learningPlan));

  const characterBible = await runStep("Character Bible", () =>
    generateCharacterBible(story),
  );

  const comicPlan = await runStep("Comic Planner", () => generateComicPlan(story));

  const validation = await runStep("Learning Validator", () =>
    validateLearning(learningPlan, story, comicPlan),
  );

  if (!validation.isValid) {
    throw new LearningSessionValidationError(validation);
  }

  await runStep("Scene Consistency Engine", () =>
    buildScenes(characterBible, comicPlan),
  );

  const imagePrompts = await runStep("Image Prompt Generator", () =>
    generateImagePrompts(comicPlan),
  );

  const renderedComic = await runStep("Comic Renderer", () =>
    renderComic(imagePrompts, {
      title: story.title,
      comicPlan,
    }),
  );

  const quiz = await runStep("Quiz Generator", () =>
    generateQuiz({
      plan: learningPlan,
      story,
      comicPlan,
    }),
  );

  return {
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
  };
}
