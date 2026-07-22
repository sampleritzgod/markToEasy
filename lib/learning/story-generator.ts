import type { LearningPlan, Story } from "./types";
import {
  asNonEmptyString,
  asStringList,
  getOpenAIClient,
  parseModelJson,
  requireModelContent,
} from "./shared";

const MODEL = "gpt-4o-mini";
const MAX_STORY_WORDS = 500;

const SYSTEM_PROMPT = `You are a story generator for beginners. Turn a learning plan into a short teaching story and return ONLY valid JSON.

Rules:
- Teach the topic and concepts through narrative, not textbook explanation.
- Use simple English that a beginner can follow.
- Keep the story body at most ${MAX_STORY_WORDS} words.
- Use ONE consistent analogy throughout — the analogy from the learning plan.
- Weave the listed concepts into the plot naturally.
- Do not generate images, comic panels, scene boards, or visual descriptions for drawing.
- Do not lecture, define terms like a textbook, or add a separate "explanation" section.
- Return valid JSON only, matching this shape exactly:
{
  "title": string,
  "setting": string,
  "characters": string[],
  "story": string,
  "moral": string
}`;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function asCharacterList(value: unknown): string[] {
  const characters = asStringList(value, "characters", "story");
  if (characters.length === 0) {
    throw new Error('Invalid story: "characters" must contain at least one character');
  }
  return characters;
}

function formatPlan(plan: LearningPlan): string {
  return JSON.stringify(
    {
      topic: plan.topic,
      difficulty: plan.difficulty,
      concepts: plan.concepts,
      analogy: plan.analogy,
      learningStyle: plan.learningStyle,
    },
    null,
    2,
  );
}

function assertValidPlan(plan: LearningPlan): void {
  if (!plan?.topic?.trim()) {
    throw new Error("Learning plan topic is required");
  }
  if (!plan.analogy?.trim()) {
    throw new Error("Learning plan analogy is required");
  }
  if (!Array.isArray(plan.concepts) || plan.concepts.length === 0) {
    throw new Error("Learning plan concepts are required");
  }
}

export function parseStory(raw: unknown): Story {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid story: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;
  const story = asNonEmptyString(data.story, "story", "story");
  const words = countWords(story);

  if (words > MAX_STORY_WORDS) {
    throw new Error(
      `Invalid story: "story" exceeds ${MAX_STORY_WORDS} words (got ${words})`,
    );
  }

  return {
    title: asNonEmptyString(data.title, "title", "story"),
    setting: asNonEmptyString(data.setting, "setting", "story"),
    characters: asCharacterList(data.characters),
    story,
    moral: asNonEmptyString(data.moral, "moral", "story"),
  };
}

export async function generateStory(plan: LearningPlan): Promise<Story> {
  assertValidPlan(plan);

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Create a beginner-friendly teaching story from this learning plan.

Use this analogy consistently: "${plan.analogy}"

Learning plan:
${formatPlan(plan)}`,
      },
    ],
  });

  const content = requireModelContent(
    response.choices[0]?.message?.content,
    "story",
  );
  return parseStory(parseModelJson(content, "story"));
}
