import { describe, expect, it } from "vitest";

import { parseImagePromptPlan } from "./image-prompt-generator";

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

  it("rejects prompts missing required elements", () => {
    expect(() =>
      parseImagePromptPlan(
        {
          style: "educational comic",
          panels: [{ id: 1, imagePrompt: "a nice drawing" }],
        },
        [1],
      ),
    ).toThrow(/missing/);
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
