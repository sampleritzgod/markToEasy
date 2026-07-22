import type {
  ConversationContext,
  ConversationHistory,
  LearningSession,
} from "./types";
import {
  asNonEmptyString,
  asStringList,
  getOpenAIClient,
  parseModelJson,
  requireModelContent,
} from "./shared";

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
    resolvedQuestion: asNonEmptyString(
      data.resolvedQuestion,
      "resolvedQuestion",
      "conversation context",
    ),
    currentTopic: asNonEmptyString(
      data.currentTopic,
      "currentTopic",
      "conversation context",
    ),
    referencedConcepts: asStringList(
      data.referencedConcepts,
      "referencedConcepts",
      "conversation context",
    ),
    contextSummary: asNonEmptyString(
      data.contextSummary,
      "contextSummary",
      "conversation context",
    ),
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

  const messages = Array.isArray(history?.messages) ? history.messages : [];
  const previousSession = history?.previousSession ?? null;

  const client = getOpenAIClient();
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

  const content = requireModelContent(
    response.choices[0]?.message?.content,
    "conversation context",
  );
  return parseConversationContext(parseModelJson(content, "conversation context"));
}
