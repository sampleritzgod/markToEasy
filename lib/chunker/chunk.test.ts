import { describe, expect, it } from "vitest";

import type { SubtitleEntry } from "@/lib/parser";

import { chunkSubtitles } from "./chunk";

function entry(
  lessonName: string,
  text: string,
  start = "00:00:00.000",
  end = "00:00:01.000",
): SubtitleEntry {
  return { lessonName, text, startTimestamp: start, endTimestamp: end };
}

describe("chunkSubtitles", () => {
  it("returns empty array for empty input", () => {
    expect(chunkSubtitles([])).toEqual([]);
  });

  it("creates a single chunk when under target words", () => {
    const chunks = chunkSubtitles([entry("Lesson A", "Hello world.")], 250);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("Hello world.");
    expect(chunks[0].lesson).toBe("Lesson A");
    expect(chunks[0].id).toBe("lesson-a-0");
  });

  it("splits on sentence boundary when target reached", () => {
    const words = Array.from({ length: 20 }, (_, i) => `word${i}`).join(" ");
    const entries = [
      entry("L", `${words}.`),
      entry("L", "Tail sentence."),
    ];
    const chunks = chunkSubtitles(entries, 20);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks[0].text).toContain("word0");
  });

  it("groups by lesson and sorts lessons", () => {
    const chunks = chunkSubtitles(
      [entry("B", "Second."), entry("A", "First.")],
      250,
    );
    expect(chunks.map((c) => c.lesson)).toEqual(["A", "B"]);
  });

  it("handles empty text entries by still joining", () => {
    const chunks = chunkSubtitles([entry("L", "")], 10);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("");
  });

  it("uses custom target words", () => {
    const chunks = chunkSubtitles([entry("L", "One two three.")], 1000);
    expect(chunks).toHaveLength(1);
  });
});
