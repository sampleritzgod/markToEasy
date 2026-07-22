import OpenAI from "openai";

import type {
  CharacterBible,
  CharacterBibleCharacter,
  CharacterBibleEnvironment,
  Story,
} from "./types";

const MODEL = "gpt-4o-mini";

const CHARACTER_FIELDS = [
  "id",
  "name",
  "role",
  "age",
  "gender",
  "appearance",
  "hairstyle",
  "clothing",
  "accessories",
  "personality",
  "facialFeatures",
  "colorPalette",
] as const;

const SYSTEM_PROMPT = `You are a character bible generator for educational comics. Turn a story into a reusable visual consistency guide and return ONLY valid JSON.

Rules:
- Generate every character only once. Do not duplicate characters under different names.
- Define each character in enough visual detail that they stay identical across every comic panel.
- Create reusable environment descriptions drawn from the story setting and scenes.
- Generate exactly one global artStyle for the entire comic.
- Generate exactly one global negativePrompt to avoid unwanted image artifacts (blur, extra limbs, text overlays, watermark, inconsistent faces, etc.).
- Use stable, slug-like ids (e.g. "char-maya", "env-classroom").
- Keep descriptions concrete and visual, not abstract.
- Do not generate images, panels, or explanations outside the JSON.
- Return valid JSON only, matching this shape exactly:
{
  "characters": [
    {
      "id": string,
      "name": string,
      "role": string,
      "age": string,
      "gender": string,
      "appearance": string,
      "hairstyle": string,
      "clothing": string,
      "accessories": string,
      "personality": string,
      "facialFeatures": string,
      "colorPalette": string
    }
  ],
  "environments": [
    {
      "id": string,
      "name": string,
      "description": string
    }
  ],
  "artStyle": string,
  "negativePrompt": string
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
    throw new Error(`Invalid character bible: "${field}" must be a non-empty string`);
  }
  return value.trim();
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

function parseCharacter(raw: unknown, index: number): CharacterBibleCharacter {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid character bible: character at index ${index} must be an object`);
  }

  const data = raw as Record<string, unknown>;
  const character = {} as CharacterBibleCharacter;

  for (const field of CHARACTER_FIELDS) {
    character[field] = asNonEmptyString(data[field], `characters[${index}].${field}`);
  }

  return character;
}

function parseEnvironment(raw: unknown, index: number): CharacterBibleEnvironment {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid character bible: environment at index ${index} must be an object`);
  }

  const data = raw as Record<string, unknown>;

  return {
    id: asNonEmptyString(data.id, `environments[${index}].id`),
    name: asNonEmptyString(data.name, `environments[${index}].name`),
    description: asNonEmptyString(data.description, `environments[${index}].description`),
  };
}

function assertUniqueIds(ids: string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    const key = id.toLowerCase();
    if (seen.has(key)) {
      throw new Error(`Invalid character bible: duplicate ${label} id "${id}"`);
    }
    seen.add(key);
  }
}

function assertUniqueNames(names: string[]): void {
  const seen = new Set<string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      throw new Error(`Invalid character bible: duplicate character name "${name}"`);
    }
    seen.add(key);
  }
}

export function parseCharacterBible(raw: unknown): CharacterBible {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid character bible: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;

  if (!Array.isArray(data.characters) || data.characters.length === 0) {
    throw new Error('Invalid character bible: "characters" must be a non-empty array');
  }

  if (!Array.isArray(data.environments) || data.environments.length === 0) {
    throw new Error('Invalid character bible: "environments" must be a non-empty array');
  }

  const characters = data.characters.map((character, index) =>
    parseCharacter(character, index),
  );
  const environments = data.environments.map((environment, index) =>
    parseEnvironment(environment, index),
  );

  assertUniqueIds(
    characters.map((character) => character.id),
    "character",
  );
  assertUniqueNames(characters.map((character) => character.name));
  assertUniqueIds(
    environments.map((environment) => environment.id),
    "environment",
  );

  return {
    characters,
    environments,
    artStyle: asNonEmptyString(data.artStyle, "artStyle"),
    negativePrompt: asNonEmptyString(data.negativePrompt, "negativePrompt"),
  };
}

export async function generateCharacterBible(story: Story): Promise<CharacterBible> {
  assertValidStory(story);

  const client = getClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Create a character bible from this story.

Include each story character exactly once: ${story.characters.join(", ")}
Build reusable environments from the setting: ${story.setting}
Define one global art style and one global negative prompt for visual consistency across all panels.

Story:
${formatStory(story)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No character bible returned from the model");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse character bible JSON");
  }

  return parseCharacterBible(parsed);
}
