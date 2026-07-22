import { describe, expect, it } from "vitest";

import {
  assertPromptCoverage,
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

  it("rejects prompts that are too short / low coverage", () => {
    expect(() =>
      parseImagePromptPlan(
        {
          style: "educational comic",
          panels: [{ id: 1, imagePrompt: "a nice drawing" }],
        },
        [1],
      ),
    ).toThrow(/too short|categories/);
  });

  it("accepts synonym-rich prompts without exact tokens", () => {
    const synonymPrompt = [
      "Two people in a classroom setting, establishing shot,",
      "warm natural light, smiling faces,",
      "illustration style educational comic panel artwork with clear poses.",
    ].join(" ");

    expect(() => assertPromptCoverage(synonymPrompt, 1)).not.toThrow();
    expect(
      parseImagePromptPlan(
        {
          style: "educational comic",
          panels: [{ id: 1, imagePrompt: synonymPrompt }],
        },
        [1],
      ).panels,
    ).toHaveLength(1);
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

describe("missingPromptCategories", () => {
  it("lists unmatched categories", () => {
    expect(missingPromptCategories("just some words here without structure")).toEqual(
      expect.arrayContaining(["character", "scene", "camera", "lighting", "expression", "style"]),
    );
  });
});
