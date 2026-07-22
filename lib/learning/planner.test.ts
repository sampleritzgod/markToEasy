import { describe, expect, it } from "vitest";

import { parseLearningPlan } from "./planner";

describe("parseLearningPlan", () => {
  const valid = {
    topic: "DNS",
    difficulty: "beginner",
    concepts: ["Names", "Records", "Resolvers"],
    analogy: "Like a phone book",
    learningStyle: "comic",
  };

  it("parses a valid plan", () => {
    expect(parseLearningPlan(valid)).toEqual({
      topic: "DNS",
      difficulty: "beginner",
      concepts: ["Names", "Records", "Resolvers"],
      analogy: "Like a phone book",
      learningStyle: "comic",
    });
  });

  it("forces learningStyle to comic regardless of input", () => {
    expect(
      parseLearningPlan({ ...valid, learningStyle: "quiz" }).learningStyle,
    ).toBe("comic");
  });

  it("trims string fields", () => {
    const plan = parseLearningPlan({
      ...valid,
      topic: "  DNS  ",
      analogy: "  phone book  ",
    });
    expect(plan.topic).toBe("DNS");
    expect(plan.analogy).toBe("phone book");
  });

  it("rejects null/undefined/non-object", () => {
    expect(() => parseLearningPlan(null)).toThrow(/JSON object/);
    expect(() => parseLearningPlan(undefined)).toThrow(/JSON object/);
    expect(() => parseLearningPlan("x")).toThrow(/JSON object/);
  });

  it("rejects empty topic", () => {
    expect(() => parseLearningPlan({ ...valid, topic: "" })).toThrow(/topic/);
    expect(() => parseLearningPlan({ ...valid, topic: "   " })).toThrow(/topic/);
  });

  it("rejects invalid difficulty", () => {
    expect(() =>
      parseLearningPlan({ ...valid, difficulty: "expert" }),
    ).toThrow(/difficulty/);
  });

  it("rejects empty concepts", () => {
    expect(() => parseLearningPlan({ ...valid, concepts: [] })).toThrow(
      /concepts/,
    );
    expect(() =>
      parseLearningPlan({ ...valid, concepts: ["", "  "] }),
    ).toThrow(/concepts/);
  });

  it("filters non-string concepts", () => {
    const plan = parseLearningPlan({
      ...valid,
      concepts: ["A", 1, null, "B"] as unknown[],
    });
    expect(plan.concepts).toEqual(["A", "B"]);
  });
});
