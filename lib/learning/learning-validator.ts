import OpenAI from "openai";

import type {
  ComicPanel,
  ComicPlan,
  LearningPlan,
  Story,
  ValidationResult,
} from "./types";

const MODEL = "gpt-4o-mini";
const MIN_SCORE = 0;
const MAX_SCORE = 100;

const PANEL_FIELDS = [
  "scene",
  "narration",
  "dialogue",
  "visualDescription",
  "learningPoint",
] as const;

const SYSTEM_PROMPT = `You are a learning validator for educational comics. Evaluate whether a learning plan, story, and comic plan form a correct, coherent teaching experience. Return ONLY valid JSON.

Checks to perform:
1. Does the comic answer the learning goal defined by the plan topic and concepts?
2. Is the content technically correct for the topic?
3. Are there hallucinations, invented facts, or misleading analogies?
4. Does every panel teach exactly one concept (one clear learningPoint)?
5. Is the panel order logically progressive?
6. Suggest concrete improvements for weak panels.
7. When a panel needs fixing, include a full corrected panel object in correctedPanels (same id, improved content).

Scoring:
- score is an integer from ${MIN_SCORE} to ${MAX_SCORE}.
- isValid should be true only when the comic is educationally sound enough to ship (generally score >= 80 and no critical factual errors).

Rules:
- feedback: short findings (strengths and issues).
- improvements: actionable suggestions for weak panels or structure.
- correctedPanels: only panels that need changes; use empty array if none.
- Preserve corrected panel ids from the comic plan.
- Do not generate images or explanations outside the JSON.
- Return valid JSON only, matching this shape exactly:
{
  "isValid": boolean,
  "score": number,
  "feedback": string[],
  "improvements": string[],
  "correctedPanels": [
    {
      "id": number,
      "scene": string,
      "narration": string,
      "dialogue": string,
      "visualDescription": string,
      "learningPoint": string
    }
  ]
}`;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

function asBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid validation result: "${field}" must be a boolean`);
  }
  return value;
}

function asScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error('Invalid validation result: "score" must be a number');
  }

  const score = Math.round(value);
  if (score < MIN_SCORE || score > MAX_SCORE) {
    throw new Error(
      `Invalid validation result: "score" must be between ${MIN_SCORE} and ${MAX_SCORE}`,
    );
  }

  return score;
}

function asStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid validation result: "${field}" must be an array`);
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid validation result: "${field}" must be a non-empty string`);
  }
  return value.trim();
}

function assertValidPlan(plan: LearningPlan): void {
  if (!plan?.topic?.trim()) {
    throw new Error("Learning plan topic is required");
  }
  if (!Array.isArray(plan.concepts) || plan.concepts.length === 0) {
    throw new Error("Learning plan concepts are required");
  }
}

function assertValidStory(story: Story): void {
  if (!story?.title?.trim()) {
    throw new Error("Story title is required");
  }
  if (!story.story?.trim()) {
    throw new Error("Story body is required");
  }
}

function assertValidComicPlan(comicPlan: ComicPlan): void {
  if (!comicPlan?.title?.trim()) {
    throw new Error("Comic plan title is required");
  }
  if (!Array.isArray(comicPlan.panels) || comicPlan.panels.length === 0) {
    throw new Error("Comic plan panels are required");
  }
}

function parseCorrectedPanel(
  raw: unknown,
  index: number,
  knownPanelIds: Set<number>,
): ComicPanel {
  if (!raw || typeof raw !== "object") {
    throw new Error(
      `Invalid validation result: correctedPanels[${index}] must be an object`,
    );
  }

  const data = raw as Record<string, unknown>;
  const id = data.id;

  if (typeof id !== "number" || !Number.isInteger(id)) {
    throw new Error(
      `Invalid validation result: correctedPanels[${index}].id must be an integer`,
    );
  }

  if (!knownPanelIds.has(id)) {
    throw new Error(
      `Invalid validation result: correctedPanels[${index}] references unknown panel id ${id}`,
    );
  }

  const panel: ComicPanel = {
    id,
    scene: asNonEmptyString(data.scene, `correctedPanels[${index}].scene`),
    narration: asNonEmptyString(
      data.narration,
      `correctedPanels[${index}].narration`,
    ),
    dialogue:
      typeof data.dialogue === "string" ? data.dialogue.trim() : "",
    visualDescription: asNonEmptyString(
      data.visualDescription,
      `correctedPanels[${index}].visualDescription`,
    ),
    learningPoint: asNonEmptyString(
      data.learningPoint,
      `correctedPanels[${index}].learningPoint`,
    ),
  };

  for (const field of PANEL_FIELDS) {
    if (field === "dialogue") {
      continue;
    }
    if (!panel[field]) {
      throw new Error(
        `Invalid validation result: correctedPanels[${index}].${field} is required`,
      );
    }
  }

  return panel;
}

export function parseValidationResult(
  raw: unknown,
  comicPlan: ComicPlan,
): ValidationResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid validation result: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;
  const knownPanelIds = new Set(comicPlan.panels.map((panel) => panel.id));

  if (!Array.isArray(data.correctedPanels)) {
    throw new Error('Invalid validation result: "correctedPanels" must be an array');
  }

  const correctedPanels = data.correctedPanels.map((panel, index) =>
    parseCorrectedPanel(panel, index, knownPanelIds),
  );

  const seen = new Set<number>();
  for (const panel of correctedPanels) {
    if (seen.has(panel.id)) {
      throw new Error(
        `Invalid validation result: duplicate corrected panel id ${panel.id}`,
      );
    }
    seen.add(panel.id);
  }

  return {
    isValid: asBoolean(data.isValid, "isValid"),
    score: asScore(data.score),
    feedback: asStringList(data.feedback, "feedback"),
    improvements: asStringList(data.improvements, "improvements"),
    correctedPanels,
  };
}

export async function validateLearning(
  plan: LearningPlan,
  story: Story,
  comicPlan: ComicPlan,
): Promise<ValidationResult> {
  assertValidPlan(plan);
  assertValidStory(story);
  assertValidComicPlan(comicPlan);

  const client = getClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Validate this educational comic package.

Learning goal (from plan — treat as the user's question intent):
Topic: ${plan.topic}
Difficulty: ${plan.difficulty}
Concepts: ${plan.concepts.join(", ")}
Analogy: ${plan.analogy}

Story:
${JSON.stringify(story, null, 2)}

Comic plan:
${JSON.stringify(comicPlan, null, 2)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No validation result returned from the model");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse validation result JSON");
  }

  return parseValidationResult(parsed, comicPlan);
}
