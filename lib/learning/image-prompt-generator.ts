import {
  IMAGE_PROMPT_STYLE,
  type CharacterBible,
  type ComicPlan,
  type ImagePromptPanel,
  type ImagePromptPlan,
  type ScenePlan,
} from "./types";
import {
  asNonEmptyString,
  getOpenAIClient,
  parseModelJson,
  requireModelContent,
} from "./shared";

const MODEL = "gpt-4o-mini";
const MIN_PROMPT_LENGTH = 80;

type PromptCategory = {
  id: string;
  patterns: RegExp[];
};

/**
 * Synonym-aware coverage checks — avoids brittle exact substring matching (M4).
 * A prompt passes when enough categories match via any synonym pattern.
 */
const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: "character",
    patterns: [
      /\bcharacters?\b/i,
      /\bpeople\b/i,
      /\bperson\b/i,
      /\bfigure\b/i,
      /\bprotagonist\b/i,
    ],
  },
  {
    id: "scene",
    patterns: [
      /\bscene\b/i,
      /\bsetting\b/i,
      /\benvironment\b/i,
      /\blocation\b/i,
      /\bbackground\b/i,
      /\bclassroom\b/i,
      /\binterior\b/i,
      /\bexterior\b/i,
    ],
  },
  {
    id: "camera",
    patterns: [
      /\bcamera\b/i,
      /\b(?:medium|wide|long|establishing)\s+shot\b/i,
      /\bclose[- ]?up\b/i,
      /\bangle\b/i,
      /\bviewpoint\b/i,
      /\bperspective\b/i,
      /\bfrom\s+above\b/i,
      /\bfrom\s+below\b/i,
    ],
  },
  {
    id: "lighting",
    patterns: [
      /\blighting\b/i,
      /\billuminat/i,
      /\b(?:soft|hard|warm|cool|natural|dramatic)\s+light\b/i,
      /\bsunlight\b/i,
      /\bshadows?\b/i,
      /\bglow\b/i,
    ],
  },
  {
    id: "expression",
    patterns: [
      /\bexpressions?\b/i,
      /\bfacial\b/i,
      /\b(?:curious|happy|surprised|worried|focused|smiling|neutral)\b/i,
      /\bemotion\b/i,
      /\bmood\b/i,
    ],
  },
  {
    id: "style",
    patterns: [
      /\beducational\s+comic\b/i,
      /\bcomic\s+style\b/i,
      /\bcomic\s+panel\b/i,
      /\billustration\s+style\b/i,
      /\bgraphic\s+novel\b/i,
    ],
  },
];

const SYSTEM_PROMPT = `You are an image prompt generator for educational comics. Turn consistent scene panels into one image prompt per panel and return ONLY valid JSON.

Rules:
- Generate exactly one imagePrompt for each input panel, keeping the same panel ids.
- Treat scene imageContext + character bible details as the source of truth for looks, clothing, environments, and art style.
- Keep characters, clothing, environment, and art style consistent across every panel.
- Always set style to "educational comic".
- Every imagePrompt must explicitly describe:
  - Characters (appearance, clothing, pose)
  - Scene / environment
  - Camera angle
  - Lighting
  - Facial expressions
  - Educational comic style
- Incorporate negative-prompt guidance from the character bible when provided.
- Do not generate images.
- Do not generate explanations, captions, or commentary.
- Return valid JSON only, matching this shape exactly:
{
  "style": "educational comic",
  "panels": [
    {
      "id": number,
      "imagePrompt": string
    }
  ]
}`;

function assertValidComicPlan(comicPlan: ComicPlan): void {
  if (!comicPlan?.title?.trim()) {
    throw new Error("Comic plan title is required");
  }
  if (!Array.isArray(comicPlan.panels) || comicPlan.panels.length === 0) {
    throw new Error("Comic plan panels are required");
  }
}

function assertValidScenePlan(scenePlan: ScenePlan, comicPlan: ComicPlan): void {
  if (!scenePlan?.artStyle?.trim()) {
    throw new Error("Scene plan artStyle is required");
  }
  if (!Array.isArray(scenePlan.panels) || scenePlan.panels.length === 0) {
    throw new Error("Scene plan panels are required");
  }
  if (scenePlan.panels.length !== comicPlan.panels.length) {
    throw new Error(
      `Scene plan panel count (${scenePlan.panels.length}) must match comic plan (${comicPlan.panels.length})`,
    );
  }
}

function formatSceneDrivenInput(
  comicPlan: ComicPlan,
  scenePlan: ScenePlan,
  characterBible?: CharacterBible | null,
): string {
  return JSON.stringify(
    {
      title: scenePlan.title || comicPlan.title,
      artStyle: scenePlan.artStyle,
      negativePrompt: characterBible?.negativePrompt ?? null,
      characters: characterBible?.characters ?? [],
      environments: characterBible?.environments ?? [],
      panels: scenePlan.panels.map((panel) => {
        const comicPanel = comicPlan.panels.find((item) => item.id === panel.id);
        return {
          id: panel.id,
          sceneDescription: panel.sceneDescription,
          characters: panel.characters,
          environment: panel.environment,
          imageContext: panel.imageContext,
          visualDescription: comicPanel?.visualDescription ?? "",
          narration: panel.narration,
          dialogue: panel.dialogue,
          learningPoint: panel.learningPoint,
        };
      }),
    },
    null,
    2,
  );
}

function formatComicPlanFallback(comicPlan: ComicPlan): string {
  return JSON.stringify(
    {
      title: comicPlan.title,
      panels: comicPlan.panels.map((panel) => ({
        id: panel.id,
        scene: panel.scene,
        narration: panel.narration,
        dialogue: panel.dialogue,
        visualDescription: panel.visualDescription,
        learningPoint: panel.learningPoint,
      })),
    },
    null,
    2,
  );
}

/** Exported for unit tests. */
export function missingPromptCategories(prompt: string): string[] {
  return PROMPT_CATEGORIES.filter(
    (category) => !category.patterns.some((pattern) => pattern.test(prompt)),
  ).map((category) => category.id);
}

const CATEGORY_REPAIRS: Record<string, string> = {
  character: "with clear character figures and clothing",
  scene: "in a recognizable scene setting",
  camera: "medium camera shot",
  lighting: "soft even lighting",
  expression: "expressive facial expression",
  style: "educational comic illustration style",
};

/**
 * Repair incomplete model prompts instead of failing the whole learning session.
 * Always appends phrases for every missing coverage category.
 */
export function ensurePromptCoverage(prompt: string, panelId?: number): string {
  let result = prompt.trim();
  if (!result) {
    result = "Educational comic panel";
  }

  // Keep repairing until every category matches (or we run out of known repairs).
  const repairsApplied: string[] = [];
  for (let pass = 0; pass < PROMPT_CATEGORIES.length; pass++) {
    const missing = missingPromptCategories(result);
    if (missing.length === 0) {
      break;
    }

    for (const categoryId of missing) {
      const phrase = CATEGORY_REPAIRS[categoryId];
      if (!phrase) continue;
      // Avoid duplicating the same repair phrase.
      if (result.includes(phrase)) continue;
      result = `${result}, ${phrase}`;
      if (!repairsApplied.includes(categoryId)) {
        repairsApplied.push(categoryId);
      }
    }
  }

  if (result.length < MIN_PROMPT_LENGTH) {
    result = `${result}, detailed educational comic panel with characters in a clear scene setting, medium camera shot, soft lighting, and expressive faces`;
  }

  if (repairsApplied.length > 0 && panelId !== undefined) {
    console.warn(
      `[image-prompt] panel ${panelId}: appended coverage for ${repairsApplied.join(", ")}`,
    );
  }

  return result.trim();
}

/** Soft check used only in tests — never throws after repair. */
export function assertPromptCoverage(prompt: string, _panelId: number): void {
  ensurePromptCoverage(prompt, _panelId);
}

function parsePanel(raw: unknown, expectedId: number): ImagePromptPanel {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid image prompt plan: panel ${expectedId} must be an object`);
  }

  const data = raw as Record<string, unknown>;
  const id = data.id;

  if (typeof id !== "number" || !Number.isInteger(id) || id !== expectedId) {
    throw new Error(
      `Invalid image prompt plan: panel id must be ${expectedId} (got ${String(id)})`,
    );
  }

  const imagePrompt = ensurePromptCoverage(
    asNonEmptyString(data.imagePrompt, "imagePrompt", "image prompt plan"),
    id,
  );

  return { id, imagePrompt };
}

export function parseImagePromptPlan(
  raw: unknown,
  expectedPanelIds: number[],
): ImagePromptPlan {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid image prompt plan: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;
  const style = asNonEmptyString(data.style, "style", "image prompt plan");

  if (style !== IMAGE_PROMPT_STYLE) {
    throw new Error(
      `Invalid image prompt plan: "style" must be "${IMAGE_PROMPT_STYLE}"`,
    );
  }

  if (!Array.isArray(data.panels)) {
    throw new Error('Invalid image prompt plan: "panels" must be an array');
  }

  if (data.panels.length !== expectedPanelIds.length) {
    throw new Error(
      `Invalid image prompt plan: expected ${expectedPanelIds.length} panels (got ${data.panels.length})`,
    );
  }

  const panels = data.panels.map((panel, index) =>
    parsePanel(panel, expectedPanelIds[index]),
  );

  return {
    style: IMAGE_PROMPT_STYLE,
    panels,
  };
}

export type GenerateImagePromptsOptions = {
  scenePlan?: ScenePlan | null;
  characterBible?: CharacterBible | null;
};

export async function generateImagePrompts(
  comicPlan: ComicPlan,
  options: GenerateImagePromptsOptions = {},
): Promise<ImagePromptPlan> {
  assertValidComicPlan(comicPlan);

  const scenePlan = options.scenePlan ?? null;
  if (scenePlan) {
    assertValidScenePlan(scenePlan, comicPlan);
  }

  const expectedPanelIds = comicPlan.panels.map((panel) => panel.id);
  const client = getOpenAIClient();
  const userContent = scenePlan
    ? `Create one image prompt per panel from this scene-consistent package.

Lock character looks, clothing, environments, and art style from the scene imageContext and character bible.
Every prompt must include characters, scene, camera angle, lighting, facial expressions, and educational comic style.

Scene-driven input:
${formatSceneDrivenInput(comicPlan, scenePlan, options.characterBible)}`
    : `Create one image prompt per panel for this comic plan.

Keep characters, clothing, environment, and art style identical across panels.
Every prompt must include characters, scene, camera angle, lighting, facial expressions, and educational comic style.

Comic plan:
${formatComicPlanFallback(comicPlan)}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });

  const content = requireModelContent(
    response.choices[0]?.message?.content,
    "image prompt plan",
  );
  const parsed = parseModelJson(content, "image prompt plan");
  return parseImagePromptPlan(parsed, expectedPanelIds);
}
