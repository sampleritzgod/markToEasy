import { describe, expect, it } from "vitest";

import { parseLearningStyle } from "./style-router";

describe("parseLearningStyle", () => {
  const valid = {
    selectedStyle: "comic",
    confidence: 85,
    reason: "Beginner-friendly visual narrative",
    alternatives: ["story", "diagram", "quiz"],
  };

  it("parses a valid style", () => {
    expect(parseLearningStyle(valid)).toEqual(valid);
  });

  it("dedupes and drops selectedStyle from alternatives", () => {
    const result = parseLearningStyle({
      ...valid,
      alternatives: ["comic", "story", "story", "timeline", "quiz", "mindmap"],
    });
    expect(result.alternatives).toEqual(["story", "timeline", "quiz"]);
  });

  it("rejects invalid selectedStyle", () => {
    expect(() =>
      parseLearningStyle({ ...valid, selectedStyle: "podcast" }),
    ).toThrow(/selectedStyle/);
  });

  it("rejects out-of-range confidence", () => {
    expect(() =>
      parseLearningStyle({ ...valid, confidence: 120 }),
    ).toThrow(/confidence/);
  });

  it("rejects empty reason", () => {
    expect(() => parseLearningStyle({ ...valid, reason: "" })).toThrow(/reason/);
  });

  it("rejects invalid alternative styles", () => {
    expect(() =>
      parseLearningStyle({ ...valid, alternatives: ["podcast"] }),
    ).toThrow(/alternative/);
  });
});
