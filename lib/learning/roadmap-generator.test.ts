import { describe, expect, it } from "vitest";

import { parseLearningRoadmap } from "./roadmap-generator";

describe("parseLearningRoadmap", () => {
  const valid = {
    currentTopic: "DNS",
    completedConcepts: ["Names", "Records"],
    nextTopics: [
      {
        title: "HTTP",
        reason: "Builds on name resolution",
        difficulty: "beginner",
      },
      {
        title: "TLS",
        reason: "Secure transport",
        difficulty: "intermediate",
      },
      {
        title: "DNSSEC",
        reason: "DNS security",
        difficulty: "advanced",
      },
    ],
    estimatedLearningTime: "2 hours",
  };

  it("parses a valid roadmap", () => {
    expect(parseLearningRoadmap(valid)).toEqual(valid);
  });

  it("rejects empty nextTopics", () => {
    expect(() =>
      parseLearningRoadmap({ ...valid, nextTopics: [] }),
    ).toThrow(/expected 3–5 next topics/);
  });

  it("rejects invalid difficulty on next topic", () => {
    expect(() =>
      parseLearningRoadmap({
        ...valid,
        nextTopics: [
          { title: "X", reason: "y", difficulty: "expert" },
          { title: "Y", reason: "y", difficulty: "beginner" },
          { title: "Z", reason: "y", difficulty: "beginner" },
        ],
      }),
    ).toThrow(/difficulty/);
  });

  it("rejects empty currentTopic", () => {
    expect(() =>
      parseLearningRoadmap({ ...valid, currentTopic: "" }),
    ).toThrow(/currentTopic/);
  });
});
