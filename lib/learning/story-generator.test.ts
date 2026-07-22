import { describe, expect, it } from "vitest";

import { parseStory } from "./story-generator";

describe("parseStory", () => {
  const valid = {
    title: "The Phone Book",
    setting: "A small town",
    characters: ["Maya", "Sam"],
    story: "Maya looked up a name in the phone book and found the number.",
    moral: "DNS maps names to addresses.",
  };

  it("parses a valid story", () => {
    expect(parseStory(valid)).toMatchObject({
      title: "The Phone Book",
      characters: ["Maya", "Sam"],
    });
  });

  it("rejects empty story body", () => {
    expect(() => parseStory({ ...valid, story: "" })).toThrow(/story/);
  });

  it("rejects empty characters", () => {
    expect(() => parseStory({ ...valid, characters: [] })).toThrow(/characters/);
  });

  it("rejects non-object", () => {
    expect(() => parseStory(null)).toThrow(/JSON object/);
  });

  it("rejects stories over 500 words", () => {
    const long = Array.from({ length: 501 }, () => "word").join(" ");
    expect(() => parseStory({ ...valid, story: long })).toThrow(/500 words/);
  });

  it("accepts exactly 500 words", () => {
    const story = Array.from({ length: 500 }, () => "word").join(" ");
    expect(parseStory({ ...valid, story }).story.split(/\s+/)).toHaveLength(500);
  });
});
