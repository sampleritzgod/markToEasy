import { describe, expect, it } from "vitest";

import { parseSrt } from "./srt";

const SAMPLE = `1
00:00:01,000 --> 00:00:03,000
Hello world

2
00:00:04,000 --> 00:00:06,000
Second cue
`;

describe("parseSrt", () => {
  it("parses numbered cues", () => {
    const cues = parseSrt(SAMPLE);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({
      text: "Hello world",
      startTimestamp: "00:00:01.000",
      endTimestamp: "00:00:03.000",
    });
  });

  it("handles BOM", () => {
    const cues = parseSrt(`\uFEFF${SAMPLE}`);
    expect(cues).toHaveLength(2);
  });

  it("skips empty cues", () => {
    const cues = parseSrt(`1
00:00:01,000 --> 00:00:02,000


2
00:00:03,000 --> 00:00:04,000
Keep me
`);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Keep me");
  });

  it("returns empty array for empty input", () => {
    expect(parseSrt("")).toEqual([]);
  });

  it("skips malformed blocks", () => {
    expect(parseSrt("not a subtitle")).toEqual([]);
  });

  it("parses cues without index numbers", () => {
    const cues = parseSrt(`00:00:01,000 --> 00:00:02,000
No index
`);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("No index");
  });
});
