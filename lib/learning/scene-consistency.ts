import type {
  CharacterBible,
  ComicPlan,
  ScenePanel,
  ScenePlan,
} from "./types";
import {
  asNonEmptyString,
  asStringList,
  getOpenAIClient,
  parseModelJson,
  requireModelContent,
} from "./shared";

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are a scene consistency engine for educational comics. Merge a character bible with a comic plan into consistent panel scenes and return ONLY valid JSON.

Rules:
- Produce exactly one output panel per comic-plan panel, preserving the same panel ids and order.
- Inject the correct bible characters into every panel (use character ids from the bible).
- Keep clothing, hairstyle, facial features, and accessories identical to the character bible for every appearance.
- Reuse bible environments when appropriate; reference environment ids or names consistently across similar scenes.
- Include the global artStyle from the character bible in every panel's imageContext.
- Generate a detailed imageContext for each panel that locks character looks, environment, action, and art style.
- Preserve narration, dialogue, and learningPoint exactly from the comic plan (do not rewrite them).
- sceneDescription should briefly describe what happens in the panel.
- environment should name the location used for that panel.
- Do not generate images or explanations outside the JSON.
- Return valid JSON only, matching this shape exactly:
{
  "title": string,
  "artStyle": string,
  "panels": [
    {
      "id": number,
      "sceneDescription": string,
      "characters": string[],
      "environment": string,
      "imageContext": string,
      "narration": string,
      "dialogue": string,
      "learningPoint": string
    }
  ]
}`;

function asNonEmptyStringList(value: unknown, field: string): string[] {
  const items = asStringList(value, field, "scene plan");
  if (items.length === 0) {
    throw new Error(`Invalid scene plan: "${field}" must contain at least one item`);
  }
  return items;
}

function assertValidCharacterBible(bible: CharacterBible): void {
  if (!bible?.artStyle?.trim()) {
    throw new Error("Character bible artStyle is required");
  }
  if (!Array.isArray(bible.characters) || bible.characters.length === 0) {
    throw new Error("Character bible characters are required");
  }
  if (!Array.isArray(bible.environments) || bible.environments.length === 0) {
    throw new Error("Character bible environments are required");
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

function formatCharacterBible(bible: CharacterBible): string {
  return JSON.stringify(bible, null, 2);
}

function formatComicPlan(comicPlan: ComicPlan): string {
  return JSON.stringify(comicPlan, null, 2);
}

function parsePanel(
  raw: unknown,
  expected: ComicPlan["panels"][number],
  knownCharacterIds: Set<string>,
): ScenePanel {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid scene plan: panel ${expected.id} must be an object`);
  }

  const data = raw as Record<string, unknown>;
  const id = data.id;

  if (typeof id !== "number" || !Number.isInteger(id) || id !== expected.id) {
    throw new Error(
      `Invalid scene plan: panel id must be ${expected.id} (got ${String(id)})`,
    );
  }

  const characters = asNonEmptyStringList(data.characters, `panels[${id}].characters`);
  for (const characterId of characters) {
    if (!knownCharacterIds.has(characterId)) {
      throw new Error(
        `Invalid scene plan: panel ${id} references unknown character "${characterId}"`,
      );
    }
  }

  const narration = asNonEmptyString(
    data.narration,
    `panels[${id}].narration`,
    "scene plan",
  );
  const dialogue =
    typeof data.dialogue === "string" ? data.dialogue.trim() : "";
  const learningPoint = asNonEmptyString(
    data.learningPoint,
    `panels[${id}].learningPoint`,
    "scene plan",
  );

  if (narration !== expected.narration.trim()) {
    throw new Error(`Invalid scene plan: panel ${id} narration was altered`);
  }
  if (dialogue !== expected.dialogue.trim()) {
    throw new Error(`Invalid scene plan: panel ${id} dialogue was altered`);
  }
  if (learningPoint !== expected.learningPoint.trim()) {
    throw new Error(`Invalid scene plan: panel ${id} learningPoint was altered`);
  }

  const imageContext = asNonEmptyString(
    data.imageContext,
    `panels[${id}].imageContext`,
    "scene plan",
  );

  return {
    id,
    sceneDescription: asNonEmptyString(
      data.sceneDescription,
      `panels[${id}].sceneDescription`,
      "scene plan",
    ),
    characters,
    environment: asNonEmptyString(
      data.environment,
      `panels[${id}].environment`,
      "scene plan",
    ),
    imageContext,
    narration,
    dialogue,
    learningPoint,
  };
}

export function parseScenePlan(
  raw: unknown,
  comicPlan: ComicPlan,
  characterBible: CharacterBible,
): ScenePlan {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid scene plan: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;
  const title = asNonEmptyString(data.title, "title", "scene plan");
  const artStyle = asNonEmptyString(data.artStyle, "artStyle", "scene plan");

  if (artStyle !== characterBible.artStyle.trim()) {
    throw new Error("Invalid scene plan: artStyle must match the character bible");
  }

  if (!Array.isArray(data.panels)) {
    throw new Error('Invalid scene plan: "panels" must be an array');
  }

  if (data.panels.length !== comicPlan.panels.length) {
    throw new Error(
      `Invalid scene plan: expected ${comicPlan.panels.length} panels (got ${data.panels.length})`,
    );
  }

  const knownCharacterIds = new Set(
    characterBible.characters.map((character) => character.id),
  );

  const panels = data.panels.map((panel, index) =>
    parsePanel(panel, comicPlan.panels[index], knownCharacterIds),
  );

  return { title, artStyle, panels };
}

export async function buildScenes(
  characterBible: CharacterBible,
  comicPlan: ComicPlan,
): Promise<ScenePlan> {
  assertValidCharacterBible(characterBible);
  assertValidComicPlan(comicPlan);

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Build a consistent scene plan from this character bible and comic plan.

Requirements:
- Use character ids from the bible in each panel's characters array.
- Keep clothing, hairstyle, facial features, and accessories identical to the bible.
- Reuse environments from the bible when scenes match.
- Put artStyle "${characterBible.artStyle}" on the plan and inside every imageContext.
- Copy narration, dialogue, and learningPoint exactly from each comic panel.
- Include negative-prompt guidance from the bible inside imageContext where helpful: ${characterBible.negativePrompt}

Character bible:
${formatCharacterBible(characterBible)}

Comic plan:
${formatComicPlan(comicPlan)}`,
      },
    ],
  });

  const content = requireModelContent(
    response.choices[0]?.message?.content,
    "scene plan",
  );
  return parseScenePlan(
    parseModelJson(content, "scene plan"),
    comicPlan,
    characterBible,
  );
}
