import OpenAI from "openai";

import type {
  ConversationContext,
  ConversationHistory,
  LearningSession,
} from "./types";

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You resolve follow-up questions in a learning chat. Return ONLY valid JSON.

Rules:
- Rewrite the current question into a clear, self-contained resolvedQuestion.
- Resolve pronouns and vague references (it, this, that, another example, explain more, why, make it simpler, etc.) using chat history and the previous learning session.
- Do not ask the user to repeat the topic.
- currentTopic: the topic the user is talking about now.
- referencedConcepts: concepts from context that the follow-up refers to (may be empty).
- contextSummary: 1–3 short sentences for downstream learning modules.
- If the question is already clear and standalone, keep resolvedQuestion close to the original.
- Return valid JSON only:
{
  "resolvedQuestion": string,
  "currentTopic": string,
  "referencedConcepts": string[],
  "contextSummary": string
}`;

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid conversation context: "${field}" must be a non-empty string`);
  }
  return value.trim();
}

function asStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid conversation context: "${field}" must be an array`);
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function summarizeSession(session: LearningSession) {
  return {
    topic: session.learningPlan.topic,
    concepts: session.concepts.concepts,
    prerequisites: session.concepts.prerequisites,
    analogy: session.learningPlan.analogy,
    storyTitle: session.story.title,
    storyMoral: session.story.moral,
  };
}

export function parseConversationContext(raw: unknown): ConversationContext {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid conversation context: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;

  return {
    resolvedQuestion: asNonEmptyString(data.resolvedQuestion, "resolvedQuestion"),
    currentTopic: asNonEmptyString(data.currentTopic, "currentTopic"),
    referencedConcepts: asStringList(data.referencedConcepts, "referencedConcepts"),
    contextSummary: asNonEmptyString(data.contextSummary, "contextSummary"),
  };
}

export async function resolveContext(
  question: string,
  history: ConversationHistory,
): Promise<ConversationContext> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Question is required");
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const messages = Array.isArray(history?.messages) ? history.messages : [];
  const previousSession = history?.previousSession ?? null;

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Current question:
${trimmed}

Chat history:
${JSON.stringify(messages, null, 2)}

Previous learning session:
${previousSession ? JSON.stringify(summarizeSession(previousSession), null, 2) : "null"}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No conversation context returned from the model");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse conversation context JSON");
  }

  return parseConversationContext(parsed);
}
