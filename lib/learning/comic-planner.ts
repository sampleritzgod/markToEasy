import type { ComicPanel, ComicPlan, Story } from "./types";
import {
  asNonEmptyString,
  getOpenAIClient,
  parseModelJson,
  requireModelContent,
} from "./shared";

const MODEL = "gpt-4o-mini";
const MIN_PANELS = 6;
const MAX_PANELS = 8;
const MAX_DIALOGUE_SENTENCES = 2;

const SYSTEM_PROMPT = `You are a comic planner. Turn a teaching story into a structured comic plan and return ONLY valid JSON.

Rules:
- Generate between ${MIN_PANELS} and ${MAX_PANELS} panels.
- Keep a consistent story, setting, and characters from the input.
- Each panel teaches exactly one idea (one learningPoint).
- Keep narration concise.
- Keep dialogue short: at most ${MAX_DIALOGUE_SENTENCES} sentences per panel. Use an empty string if there is no dialogue.
- visualDescription must clearly describe what appears in that panel's image (who, where, action, expression). Do not write image-generation prompts, style tags, camera jargon, or model instructions.
- The final panel must be a summary panel that reinforces the moral / main takeaway.
- Do not generate images.
- Do not generate image prompts.
- Return valid JSON only, matching this shape exactly:
{
  "title": string,
  "panels": [
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

function asOptionalTrimmedString(value: unknown, field: string): string {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value !== "string") {
    throw new Error(`Invalid comic plan: "${field}" must be a string`);
  }
  return value.trim();
}

/** Keep at most max sentences; models often overshoot the dialogue limit. */
export function clampDialogue(
  text: string,
  maxSentences: number = MAX_DIALOGUE_SENTENCES,
): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= maxSentences) {
    return trimmed;
  }

  return sentences.slice(0, maxSentences).join(" ").trim();
}

function assertValidStory(story: Story): void {
  if (!story?.title?.trim()) {
    throw new Error("Story title is required");
  }
  if (!story.story?.trim()) {
    throw new Error("Story body is required");
  }
  if (!Array.isArray(story.characters) || story.characters.length === 0) {
    throw new Error("Story characters are required");
  }
}

function formatStory(story: Story): string {
  return JSON.stringify(
    {
      title: story.title,
      setting: story.setting,
      characters: story.characters,
      story: story.story,
      moral: story.moral,
    },
    null,
    2,
  );
}

function parsePanel(raw: unknown, expectedId: number): ComicPanel {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid comic plan: panel ${expectedId} must be an object`);
  }

  const data = raw as Record<string, unknown>;
  const id = data.id;

  if (typeof id !== "number" || !Number.isInteger(id) || id !== expectedId) {
    throw new Error(
      `Invalid comic plan: panel id must be ${expectedId} (got ${String(id)})`,
    );
  }

  const dialogue = clampDialogue(asOptionalTrimmedString(data.dialogue, "dialogue"));

  return {
    id,
    scene: asNonEmptyString(data.scene, "scene", "comic plan"),
    narration: asNonEmptyString(data.narration, "narration", "comic plan"),
    dialogue,
    visualDescription: asNonEmptyString(
      data.visualDescription,
      "visualDescription",
      "comic plan",
    ),
    learningPoint: asNonEmptyString(data.learningPoint, "learningPoint", "comic plan"),
  };
}

export function parseComicPlan(raw: unknown): ComicPlan {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid comic plan: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;
  const title = asNonEmptyString(data.title, "title", "comic plan");

  if (!Array.isArray(data.panels)) {
    throw new Error('Invalid comic plan: "panels" must be an array');
  }

  if (data.panels.length < MIN_PANELS || data.panels.length > MAX_PANELS) {
    throw new Error(
      `Invalid comic plan: expected ${MIN_PANELS}-${MAX_PANELS} panels (got ${data.panels.length})`,
    );
  }

  const panels = data.panels.map((panel, index) => parsePanel(panel, index + 1));

  return { title, panels };
}

export async function generateComicPlan(story: Story): Promise<ComicPlan> {
  assertValidStory(story);

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Create a comic plan from this story.

Use the same title unless a clearer comic title fits.
Keep characters consistent: ${story.characters.join(", ")}
End with a final summary panel based on the moral.

Story:
${formatStory(story)}`,
      },
    ],
  });

  const content = requireModelContent(
    response.choices[0]?.message?.content,
    "comic plan",
  );
  return parseComicPlan(parseModelJson(content, "comic plan"));
}
