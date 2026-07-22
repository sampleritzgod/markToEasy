import OpenAI from "openai";

import {
  ADAPTATION_TYPES,
  REGENERATE_TARGETS,
  type Adaptation,
  type AdaptationSession,
  type AdaptationType,
  type RegenerateTarget,
} from "./types";

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You adapt a completed lesson based on user feedback. Return ONLY valid JSON.

Supported adaptationType values (pick exactly one):
${ADAPTATION_TYPES.map((type) => `- ${type}`).join("\n")}

Allowed regenerate targets (subset only):
${REGENERATE_TARGETS.map((target) => `- ${target}`).join("\n")}

Rules:
- Detect what the user wants from their feedback.
- Set adaptationType to the best matching supported value.
- Write updatedInstructions that downstream generators can follow (clear, concrete, short).
- regenerate: only the modules that must be rebuilt. Do not regenerate everything by default.
  - story: narrative/explanation needs rewriting
  - comic: panels/visual teaching need changes
  - quiz: assessment should change with the new explanation
- Prefer the smallest regenerate set that satisfies the feedback.
- Examples:
  - "Make it simpler" / "Explain like I'm 10" → simpler; often story + comic (+ quiz if needed)
  - "Give me a real-world example" → real-world analogy or example-driven; often story
  - "Skip the story" → visual-first or shorter; regenerate comic, maybe skip story rewrite if instructions say omit story framing
  - "I didn't understand" → simpler or step-by-step; story + comic
- Return valid JSON only:
{
  "adaptationType": string,
  "updatedInstructions": string,
  "regenerate": string[]
}`;

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid adaptation: "${field}" must be a non-empty string`);
  }
  return value.trim();
}

function isAdaptationType(value: unknown): value is AdaptationType {
  return (
    typeof value === "string" &&
    (ADAPTATION_TYPES as readonly string[]).includes(value)
  );
}

function isRegenerateTarget(value: unknown): value is RegenerateTarget {
  return (
    typeof value === "string" &&
    (REGENERATE_TARGETS as readonly string[]).includes(value)
  );
}

function assertValidSession(session: AdaptationSession): void {
  if (!session?.learningPlan?.topic?.trim()) {
    throw new Error("Learning plan topic is required");
  }
  if (!session.story?.title?.trim()) {
    throw new Error("Story title is required");
  }
  if (!Array.isArray(session.comicPlan?.panels)) {
    throw new Error("Comic plan is required");
  }
}

export function parseAdaptation(raw: unknown): Adaptation {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid adaptation: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;
  const adaptationType = data.adaptationType;

  if (!isAdaptationType(adaptationType)) {
    throw new Error(
      `Invalid adaptation: "adaptationType" must be one of ${ADAPTATION_TYPES.join(", ")}`,
    );
  }

  if (!Array.isArray(data.regenerate)) {
    throw new Error('Invalid adaptation: "regenerate" must be an array');
  }

  const regenerate: RegenerateTarget[] = [];
  const seen = new Set<string>();

  for (const item of data.regenerate) {
    if (!isRegenerateTarget(item)) {
      throw new Error(
        `Invalid adaptation: regenerate target must be one of ${REGENERATE_TARGETS.join(", ")}`,
      );
    }
    if (!seen.has(item)) {
      seen.add(item);
      regenerate.push(item);
    }
  }

  if (regenerate.length === 0) {
    throw new Error('Invalid adaptation: "regenerate" must include at least one module');
  }

  return {
    adaptationType,
    updatedInstructions: asNonEmptyString(
      data.updatedInstructions,
      "updatedInstructions",
    ),
    regenerate,
  };
}

export async function adaptExplanation(
  feedback: string,
  session: AdaptationSession,
): Promise<Adaptation> {
  const trimmed = feedback.trim();
  if (!trimmed) {
    throw new Error("Feedback is required");
  }
  assertValidSession(session);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `User feedback:
${trimmed}

Conversation context:
${JSON.stringify(session.conversationContext ?? null, null, 2)}

Learning plan:
${JSON.stringify(session.learningPlan, null, 2)}

Story:
${JSON.stringify(
  {
    title: session.story.title,
    setting: session.story.setting,
    moral: session.story.moral,
    storyPreview: session.story.story.slice(0, 500),
  },
  null,
  2,
)}

Comic plan:
${JSON.stringify(
  {
    title: session.comicPlan.title,
    panelCount: session.comicPlan.panels.length,
    learningPoints: session.comicPlan.panels.map((panel) => panel.learningPoint),
  },
  null,
  2,
)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No adaptation returned from the model");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse adaptation JSON");
  }

  return parseAdaptation(parsed);
}
