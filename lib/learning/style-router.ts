import {
  LEARNING_STYLES,
  type LearningPlan,
  type LearningStyle,
  type LearningStyleId,
} from "./types";
import {
  asNonEmptyString,
  getOpenAIClient,
  parseModelJson,
  requireModelContent,
} from "./shared";

const MODEL = "gpt-4o-mini";
const MIN_CONFIDENCE = 0;
const MAX_CONFIDENCE = 100;
const MAX_ALTERNATIVES = 3;

const SYSTEM_PROMPT = `You are a learning style router. Choose the most effective teaching style for a learner's question and learning plan. Return ONLY valid JSON.

Supported styles (selectedStyle and alternatives must be from this list only):
${LEARNING_STYLES.map((style) => `- ${style}`).join("\n")}

Style guidance:
- comic: character-driven visual narrative for beginners and relatable concepts
- story: prose narrative when emotion, motivation, or analogy carries understanding
- timeline: chronological sequences, history, evolution, cause-then-effect over time
- flowchart: request/response, algorithms, decision trees, protocols, multi-step processes
- mindmap: related ideas radiating from a central concept; taxonomy and associations
- diagram: spatial structure, architecture, anatomy, layered systems
- animation: motion, state changes, continuous processes best shown over time
- quiz: check understanding, reinforce recall, practice application

Rules:
- Choose the single most effective selectedStyle for the concept.
- confidence is an integer from ${MIN_CONFIDENCE} to ${MAX_CONFIDENCE}.
- reason must briefly explain why that style fits (1–2 sentences).
- alternatives: up to ${MAX_ALTERNATIVES} other suitable styles, excluding selectedStyle, ordered best-first.
- Do not invent styles outside the supported list.
- Return valid JSON only, matching this shape exactly:
{
  "selectedStyle": string,
  "confidence": number,
  "reason": string,
  "alternatives": string[]
}`;

function isLearningStyleId(value: unknown): value is LearningStyleId {
  return (
    typeof value === "string" &&
    (LEARNING_STYLES as readonly string[]).includes(value)
  );
}

function asConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error('Invalid learning style: "confidence" must be a number');
  }

  const confidence = Math.round(value);
  if (confidence < MIN_CONFIDENCE || confidence > MAX_CONFIDENCE) {
    throw new Error(
      `Invalid learning style: "confidence" must be between ${MIN_CONFIDENCE} and ${MAX_CONFIDENCE}`,
    );
  }

  return confidence;
}

function asAlternatives(
  value: unknown,
  selectedStyle: LearningStyleId,
): LearningStyleId[] {
  if (!Array.isArray(value)) {
    throw new Error('Invalid learning style: "alternatives" must be an array');
  }

  const alternatives: LearningStyleId[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!isLearningStyleId(item)) {
      throw new Error(
        `Invalid learning style: alternative must be one of ${LEARNING_STYLES.join(", ")}`,
      );
    }
    if (item === selectedStyle || seen.has(item)) {
      continue;
    }
    seen.add(item);
    alternatives.push(item);
    if (alternatives.length === MAX_ALTERNATIVES) {
      break;
    }
  }

  return alternatives;
}

function assertValidPlan(learningPlan: LearningPlan): void {
  if (!learningPlan?.topic?.trim()) {
    throw new Error("Learning plan topic is required");
  }
  if (!Array.isArray(learningPlan.concepts) || learningPlan.concepts.length === 0) {
    throw new Error("Learning plan concepts are required");
  }
}

export function parseLearningStyle(raw: unknown): LearningStyle {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid learning style: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;
  const selectedStyle = data.selectedStyle;

  if (!isLearningStyleId(selectedStyle)) {
    throw new Error(
      `Invalid learning style: "selectedStyle" must be one of ${LEARNING_STYLES.join(", ")}`,
    );
  }

  return {
    selectedStyle,
    confidence: asConfidence(data.confidence),
    reason: asNonEmptyString(data.reason, "reason", "learning style"),
    alternatives: asAlternatives(data.alternatives, selectedStyle),
  };
}

export async function selectLearningStyle(
  question: string,
  learningPlan: LearningPlan,
): Promise<LearningStyle> {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) {
    throw new Error("Question is required");
  }
  assertValidPlan(learningPlan);

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Select the best learning style.

Question:
${trimmedQuestion}

Learning plan:
${JSON.stringify(learningPlan, null, 2)}`,
      },
    ],
  });

  const content = requireModelContent(
    response.choices[0]?.message?.content,
    "learning style",
  );
  return parseLearningStyle(parseModelJson(content, "learning style"));
}
