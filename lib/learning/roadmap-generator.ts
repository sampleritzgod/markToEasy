import OpenAI from "openai";

import {
  LEARNING_DIFFICULTIES,
  type LearningDifficulty,
  type LearningRoadmap,
  type RoadmapNextTopic,
  type RoadmapSession,
} from "./types";

const MODEL = "gpt-4o-mini";
const MIN_NEXT_TOPICS = 3;
const MAX_NEXT_TOPICS = 5;

const SYSTEM_PROMPT = `Generate a personalized learning roadmap from the current lesson. Return ONLY valid JSON.

Rules:
- Recommend ${MIN_NEXT_TOPICS}–${MAX_NEXT_TOPICS} nextTopics.
- Order nextTopics by dependency (foundations before advanced).
- Do not recommend concepts already covered in completedConcepts / current lesson concepts.
- Keep recommendations practical and beginner-friendly.
- difficulty must be one of: ${LEARNING_DIFFICULTIES.join(", ")}.
- estimatedLearningTime: a short human estimate (e.g. "2–3 hours", "1 week").
- completedConcepts: concepts the learner has already covered from this lesson.
- Return valid JSON only:
{
  "currentTopic": string,
  "completedConcepts": string[],
  "nextTopics": [
    {
      "title": string,
      "reason": string,
      "difficulty": "beginner" | "intermediate" | "advanced"
    }
  ],
  "estimatedLearningTime": string
}`;

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid learning roadmap: "${field}" must be a non-empty string`);
  }
  return value.trim();
}

function asStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid learning roadmap: "${field}" must be an array`);
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isDifficulty(value: unknown): value is LearningDifficulty {
  return (
    typeof value === "string" &&
    (LEARNING_DIFFICULTIES as readonly string[]).includes(value)
  );
}

function parseNextTopic(raw: unknown, index: number): RoadmapNextTopic {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid learning roadmap: nextTopics[${index}] must be an object`);
  }

  const data = raw as Record<string, unknown>;
  if (!isDifficulty(data.difficulty)) {
    throw new Error(
      `Invalid learning roadmap: nextTopics[${index}].difficulty must be one of ${LEARNING_DIFFICULTIES.join(", ")}`,
    );
  }

  return {
    title: asNonEmptyString(data.title, `nextTopics[${index}].title`),
    reason: asNonEmptyString(data.reason, `nextTopics[${index}].reason`),
    difficulty: data.difficulty,
  };
}

function assertValidSession(session: RoadmapSession): void {
  if (!session?.currentLesson?.topic?.trim()) {
    throw new Error("Current lesson topic is required");
  }
  if (!session.concepts) {
    throw new Error("Extracted concepts are required");
  }
}

export function parseLearningRoadmap(raw: unknown): LearningRoadmap {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid learning roadmap: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.nextTopics)) {
    throw new Error('Invalid learning roadmap: "nextTopics" must be an array');
  }

  if (
    data.nextTopics.length < MIN_NEXT_TOPICS ||
    data.nextTopics.length > MAX_NEXT_TOPICS
  ) {
    throw new Error(
      `Invalid learning roadmap: expected ${MIN_NEXT_TOPICS}–${MAX_NEXT_TOPICS} next topics (got ${data.nextTopics.length})`,
    );
  }

  return {
    currentTopic: asNonEmptyString(data.currentTopic, "currentTopic"),
    completedConcepts: asStringList(data.completedConcepts, "completedConcepts"),
    nextTopics: data.nextTopics.map((topic, index) => parseNextTopic(topic, index)),
    estimatedLearningTime: asNonEmptyString(
      data.estimatedLearningTime,
      "estimatedLearningTime",
    ),
  };
}

export async function generateRoadmap(
  session: RoadmapSession,
): Promise<LearningRoadmap> {
  assertValidSession(session);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Build a learning roadmap.

Current lesson:
${JSON.stringify(session.currentLesson, null, 2)}

Extracted concepts:
${JSON.stringify(session.concepts, null, 2)}

Conversation history:
${JSON.stringify(session.conversationHistory ?? [], null, 2)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No learning roadmap returned from the model");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse learning roadmap JSON");
  }

  return parseLearningRoadmap(parsed);
}
