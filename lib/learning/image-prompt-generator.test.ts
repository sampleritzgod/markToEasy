import { describe, expect, it } from "vitest";

import {
  ensurePromptCoverage,
  missingPromptCategories,
  parseImagePromptPlan,
} from "./image-prompt-generator";

function goodPrompt(): string {
  return [
    "A friendly character stands in a classroom scene,",
    "camera angle medium shot, soft lighting,",
    "curious facial expression,",
    "educational comic style.",
  ].join(" ");
}

describe("parseImagePromptPlan", () => {
  const ids = [1, 2, 3];

  const valid = {
    style: "educational comic",
    panels: ids.map((id) => ({ id, imagePrompt: goodPrompt() })),
  };

  it("parses a valid plan", () => {
    const plan = parseImagePromptPlan(valid, ids);
    expect(plan.style).toBe("educational comic");
    expect(plan.panels).toHaveLength(3);
  });

  it("rejects wrong style", () => {
    expect(() =>
      parseImagePromptPlan({ ...valid, style: "anime" }, ids),
    ).toThrow(/style/);
  });

  it("rejects panel count mismatch", () => {
    expect(() => parseImagePromptPlan(valid, [1, 2])).toThrow(/expected 2/);
  });

  it("repairs the exact production failure: missing character, scene, style", () => {
    // Matches the live error: covers 3/6; missing character, scene, style
    const thinPrompt =
      "Close-up camera of a glowing DNS resolver node, dramatic lighting, focused expression on the interface.";

    expect(missingPromptCategories(thinPrompt)).toEqual(
      expect.arrayContaining(["character", "scene", "style"]),
    );

    const plan = parseImagePromptPlan(
      {
        style: "educational comic",
        panels: [{ id: 1, imagePrompt: thinPrompt }],
      },
      [1],
    );

    expect(plan.panels[0].imagePrompt).toMatch(/character/i);
    expect(plan.panels[0].imagePrompt).toMatch(/scene/i);
    expect(plan.panels[0].imagePrompt).toMatch(/comic/i);
    expect(missingPromptCategories(plan.panels[0].imagePrompt)).toEqual([]);
  });

  it("repairs extremely thin prompts without throwing", () => {
    const plan = parseImagePromptPlan(
      {
        style: "educational comic",
        panels: [{ id: 1, imagePrompt: "a nice drawing of DNS" }],
      },
      [1],
    );
    expect(missingPromptCategories(plan.panels[0].imagePrompt)).toEqual([]);
  });

  it("rejects wrong panel id", () => {
    expect(() =>
      parseImagePromptPlan(
        {
          style: "educational comic",
          panels: [{ id: 9, imagePrompt: goodPrompt() }],
        },
        [1],
      ),
    ).toThrow(/panel id must be 1/);
  });

  it("rejects empty prompt", () => {
    expect(() =>
      parseImagePromptPlan(
        {
          style: "educational comic",
          panels: [{ id: 1, imagePrompt: "   " }],
        },
        [1],
      ),
    ).toThrow(/imagePrompt/);
  });
});

describe("ensurePromptCoverage", () => {
  it("never throws and fills all categories", () => {
    const repaired = ensurePromptCoverage("diagram only", 1);
    expect(missingPromptCategories(repaired)).toEqual([]);
  });
});
