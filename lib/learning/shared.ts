import OpenAI from "openai";

/** Shared OpenAI client for learning modules. */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

export function asNonEmptyString(
  value: unknown,
  field: string,
  entity = "value",
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid ${entity}: "${field}" must be a non-empty string`);
  }
  return value.trim();
}

export function asStringList(
  value: unknown,
  field: string,
  entity = "value",
): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${entity}: "${field}" must be an array`);
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseModelJson(content: string, what: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`Failed to parse ${what} JSON`);
  }
}

export function requireModelContent(
  content: string | null | undefined,
  what: string,
): string {
  const trimmed = content?.trim();
  if (!trimmed) {
    throw new Error(`No ${what} returned from the model`);
  }
  return trimmed;
}
