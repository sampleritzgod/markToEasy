import { describe, expect, it } from "vitest";

import { parseValidationResult } from "./learning-validator";
import type { ComicPlan } from "./types";

const comicPlan: ComicPlan = {
  title: "DNS",
  panels: [
    {
      id: 1,
      scene: "s1",
      narration: "n1",
      dialogue: "d1",
      visualDescription: "v1",
      learningPoint: "p1",
    },
    {
      id: 2,
      scene: "s2",
      narration: "n2",
      dialogue: "",
      visualDescription: "v2",
      learningPoint: "p2",
    },
  ],
};

describe("parseValidationResult", () => {
  const valid = {
    isValid: true,
    score: 90,
    feedback: ["Good structure"],
    improvements: [],
    correctedPanels: [],
  };

  it("parses a valid result", () => {
    expect(parseValidationResult(valid, comicPlan)).toEqual(valid);
  });

  it("rounds fractional scores", () => {
    expect(parseValidationResult({ ...valid, score: 88.7 }, comicPlan).score).toBe(
      89,
    );
  });

  it("rejects out-of-range scores", () => {
    expect(() =>
      parseValidationResult({ ...valid, score: 101 }, comicPlan),
    ).toThrow(/between 0 and 100/);
    expect(() =>
      parseValidationResult({ ...valid, score: -1 }, comicPlan),
    ).toThrow(/between 0 and 100/);
  });

  it("rejects non-boolean isValid", () => {
    expect(() =>
      parseValidationResult({ ...valid, isValid: "yes" }, comicPlan),
    ).toThrow(/isValid/);
  });

  it("rejects unknown corrected panel ids", () => {
    expect(() =>
      parseValidationResult(
        {
          ...valid,
          correctedPanels: [
            {
              id: 99,
              scene: "s",
              narration: "n",
              dialogue: "",
              visualDescription: "v",
              learningPoint: "p",
            },
          ],
        },
        comicPlan,
      ),
    ).toThrow(/unknown panel id/);
  });

  it("accepts corrected panels for known ids", () => {
    const result = parseValidationResult(
      {
        ...valid,
        isValid: false,
        score: 70,
        correctedPanels: [
          {
            id: 1,
            scene: "fixed",
            narration: "fixed",
            dialogue: "",
            visualDescription: "fixed",
            learningPoint: "fixed",
          },
        ],
      },
      comicPlan,
    );
    expect(result.correctedPanels[0].scene).toBe("fixed");
  });
});
