import OpenAI from "openai";

import {
  IMAGE_PROMPT_STYLE,
  type ComicPlan,
  type ImagePromptPanel,
  type ImagePromptPlan,
} from "./types";

const MODEL = "gpt-4o-mini";

const REQUIRED_PROMPT_ELEMENTS = [
  "character",
  "scene",
  "camera",
  "lighting",
  "expression",
  "educational comic",
] as const;

const SYSTEM_PROMPT = `You are an image prompt generator for educational comics. Turn a comic plan into one image prompt per panel and return ONLY valid JSON.

Rules:
- Generate exactly one imagePrompt for each input panel, keeping the same panel ids.
- Keep characters, clothing, environment, and art style consistent across every panel.
- Always set style to "educational comic".
- Every imagePrompt must explicitly describe:
  - Characters (appearance, clothing, pose)
  - Scene / environment
  - Camera angle
  - Lighting
  - Facial expressions
  - Educational comic style
- Use one consistent visual style for the entire comic.
- Do not generate images.
- Do not generate explanations, captions, or commentary.
- Return valid JSON only, matching this shape exactly:
{
  "style": "educational comic",
  "panels": [
    {
      "id": number,
      "imagePrompt": string
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

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid image prompt plan: "${field}" must be a non-empty string`);
  }
  return value.trim();
}

function assertValidComicPlan(comicPlan: ComicPlan): void {
  if (!comicPlan?.title?.trim()) {
    throw new Error("Comic plan title is required");
  }
  if (!Array.isArray(comicPlan.panels) || comicPlan.panels.length === 0) {
    throw new Error("Comic plan panels are required");
  }
}

function formatComicPlan(comicPlan: ComicPlan): string {
  return JSON.stringify(
    {
      title: comicPlan.title,
      panels: comicPlan.panels.map((panel) => ({
        id: panel.id,
        scene: panel.scene,
        narration: panel.narration,
        dialogue: panel.dialogue,
        visualDescription: panel.visualDescription,
        learningPoint: panel.learningPoint,
      })),
    },
    null,
    2,
  );
}

function assertPromptCoverage(prompt: string, panelId: number): void {
  const lower = prompt.toLowerCase();
  const missing = REQUIRED_PROMPT_ELEMENTS.filter((element) => !lower.includes(element));

  if (missing.length > 0) {
    throw new Error(
      `Invalid image prompt plan: panel ${panelId} prompt is missing: ${missing.join(", ")}`,
    );
  }
}

function parsePanel(
  raw: unknown,
  expectedId: number,
): ImagePromptPanel {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid image prompt plan: panel ${expectedId} must be an object`);
  }

  const data = raw as Record<string, unknown>;
  const id = data.id;

  if (typeof id !== "number" || !Number.isInteger(id) || id !== expectedId) {
    throw new Error(
      `Invalid image prompt plan: panel id must be ${expectedId} (got ${String(id)})`,
    );
  }

  const imagePrompt = asNonEmptyString(data.imagePrompt, "imagePrompt");
  assertPromptCoverage(imagePrompt, id);

  return { id, imagePrompt };
}

export function parseImagePromptPlan(
  raw: unknown,
  expectedPanelIds: number[],
): ImagePromptPlan {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid image prompt plan: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;
  const style = asNonEmptyString(data.style, "style");

  if (style !== IMAGE_PROMPT_STYLE) {
    throw new Error(
      `Invalid image prompt plan: "style" must be "${IMAGE_PROMPT_STYLE}"`,
    );
  }

  if (!Array.isArray(data.panels)) {
    throw new Error('Invalid image prompt plan: "panels" must be an array');
  }

  if (data.panels.length !== expectedPanelIds.length) {
    throw new Error(
      `Invalid image prompt plan: expected ${expectedPanelIds.length} panels (got ${data.panels.length})`,
    );
  }

  const panels = data.panels.map((panel, index) =>
    parsePanel(panel, expectedPanelIds[index]),
  );

  return {
    style: IMAGE_PROMPT_STYLE,
    panels,
  };
}

export async function generateImagePrompts(
  comicPlan: ComicPlan,
): Promise<ImagePromptPlan> {
  assertValidComicPlan(comicPlan);

  const expectedPanelIds = comicPlan.panels.map((panel) => panel.id);
  const client = getClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Create one image prompt per panel for this comic plan.

Keep characters, clothing, environment, and art style identical across panels.
Every prompt must include characters, scene, camera angle, lighting, facial expressions, and educational comic style.

Comic plan:
${formatComicPlan(comicPlan)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No image prompt plan returned from the model");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse image prompt plan JSON");
  }

  return parseImagePromptPlan(parsed, expectedPanelIds);
}
