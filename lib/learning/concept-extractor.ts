import type { ConceptExtraction } from "./types";
import {
  asNonEmptyString,
  asStringList,
  getOpenAIClient,
  parseModelJson,
  requireModelContent,
} from "./shared";

const MODEL = "gpt-4o-mini";
const MIN_CONCEPTS = 3;
const MAX_CONCEPTS = 10;

const SYSTEM_PROMPT = `Extract the important learning concepts from the user's question. Return ONLY valid JSON.

Rules:
- Infer a clear topic name.
- Return ${MIN_CONCEPTS}–${MAX_CONCEPTS} core concepts needed to understand the topic.
- List only the most relevant concepts — no fluff.
- prerequisites: foundational topics the learner should know first (may be empty).
- advancedTopics: related deeper topics beyond the core answer (may be empty).
- Do not build graphs, relationships, or explanations.
- Return valid JSON only:
{
  "topic": string,
  "concepts": string[],
  "prerequisites": string[],
  "advancedTopics": string[]
}`;

export function parseConceptExtraction(raw: unknown): ConceptExtraction {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid concept extraction: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;
  const concepts = asStringList(data.concepts, "concepts", "concept extraction");

  if (concepts.length < MIN_CONCEPTS || concepts.length > MAX_CONCEPTS) {
    throw new Error(
      `Invalid concept extraction: expected ${MIN_CONCEPTS}–${MAX_CONCEPTS} concepts (got ${concepts.length})`,
    );
  }

  return {
    topic: asNonEmptyString(data.topic, "topic", "concept extraction"),
    concepts,
    prerequisites: asStringList(
      data.prerequisites,
      "prerequisites",
      "concept extraction",
    ),
    advancedTopics: asStringList(
      data.advancedTopics,
      "advancedTopics",
      "concept extraction",
    ),
  };
}

export async function extractConcepts(question: string): Promise<ConceptExtraction> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Question is required");
  }

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: trimmed },
    ],
  });

  const content = requireModelContent(
    response.choices[0]?.message?.content,
    "concept extraction",
  );
  return parseConceptExtraction(parseModelJson(content, "concept extraction"));
}
