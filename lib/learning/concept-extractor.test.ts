import { describe, expect, it } from "vitest";

import { parseConceptExtraction } from "./concept-extractor";

describe("parseConceptExtraction", () => {
  const valid = {
    topic: "DNS",
    concepts: ["Names", "Records", "Resolvers"],
    prerequisites: ["Networking basics"],
    advancedTopics: ["DNSSEC"],
  };

  it("parses a valid extraction", () => {
    expect(parseConceptExtraction(valid)).toEqual(valid);
  });

  it("allows empty prerequisites and advancedTopics", () => {
    expect(
      parseConceptExtraction({
        ...valid,
        prerequisites: [],
        advancedTopics: [],
      }),
    ).toMatchObject({ prerequisites: [], advancedTopics: [] });
  });

  it("rejects fewer than 3 concepts", () => {
    expect(() =>
      parseConceptExtraction({ ...valid, concepts: ["A", "B"] }),
    ).toThrow(/3–10 concepts/);
  });

  it("rejects more than 10 concepts", () => {
    const concepts = Array.from({ length: 11 }, (_, i) => `C${i}`);
    expect(() =>
      parseConceptExtraction({ ...valid, concepts }),
    ).toThrow(/3–10 concepts/);
  });

  it("rejects empty topic", () => {
    expect(() => parseConceptExtraction({ ...valid, topic: "" })).toThrow(
      /topic/,
    );
  });
});
