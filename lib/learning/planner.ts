import OpenAI from "openai";

import {
  LEARNING_DIFFICULTIES,
  LEARNING_STYLE,
  type LearningDifficulty,
  type LearningPlan,
  type PlanLearningInput,
} from "./types";

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are a learning planner. Analyze the user's question and return ONLY a JSON learning plan.

Rules:
- Analyze the question. Do not explain the topic.
- Do not write a final explanation or lesson content.
- Do not describe or generate images, panels, or comic frames.
- Infer a clear topic name from the question.
- Set difficulty to exactly one of: beginner, intermediate, advanced.
- List 3 to 7 foundational concepts the learner must understand, ordered from basics to more specific.
- Provide one short, concrete analogy that makes the topic intuitive.
- Always set learningStyle to "comic".
- Return valid JSON only, matching this shape exactly:
{
  "topic": string,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "concepts": string[],
  "analogy": string,
  "learningStyle": "comic"
}`;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

function isDifficulty(value: unknown): value is LearningDifficulty {
  return (
    typeof value === "string" &&
    (LEARNING_DIFFICULTIES as readonly string[]).includes(value)
  );
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid learning plan: "${field}" must be a non-empty string`);
  }
  return value.trim();
}

function asConceptList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid learning plan: "concepts" must be an array');
  }

  const concepts = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (concepts.length === 0) {
    throw new Error('Invalid learning plan: "concepts" must contain at least one concept');
  }

  return concepts;
}

export function parseLearningPlan(raw: unknown): LearningPlan {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid learning plan: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;
  const difficulty = data.difficulty;

  if (!isDifficulty(difficulty)) {
    throw new Error(
      `Invalid learning plan: "difficulty" must be one of ${LEARNING_DIFFICULTIES.join(", ")}`,
    );
  }

  return {
    topic: asNonEmptyString(data.topic, "topic"),
    difficulty,
    concepts: asConceptList(data.concepts),
    analogy: asNonEmptyString(data.analogy, "analogy"),
    learningStyle: LEARNING_STYLE,
  };
}

export async function planLearning(input: PlanLearningInput): Promise<LearningPlan> {
  const question = input.question.trim();
  if (!question) {
    throw new Error("Question is required");
  }

  const client = getClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No learning plan returned from the model");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse learning plan JSON");
  }

  return parseLearningPlan(parsed);
}
