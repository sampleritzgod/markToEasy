import { describe, expect, it } from "vitest";

import { parseVtt } from "./vtt";

const SAMPLE = `WEBVTT

00:00:01.000 --> 00:00:03.000
Hello from VTT

00:00:04.000 --> 00:00:06.000
Second cue
`;

describe("parseVtt", () => {
  it("parses WEBVTT cues", () => {
    const cues = parseVtt(SAMPLE);
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe("Hello from VTT");
    expect(cues[0].startTimestamp).toBe("00:00:01.000");
  });

  it("skips NOTE blocks", () => {
    const cues = parseVtt(`WEBVTT

NOTE This is a note

00:00:01.000 --> 00:00:02.000
Real cue
`);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Real cue");
  });

  it("handles cue identifiers", () => {
    const cues = parseVtt(`WEBVTT

cue1
00:00:01.000 --> 00:00:02.000
Identified
`);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe("Identified");
  });

  it("returns empty for header-only", () => {
    expect(parseVtt("WEBVTT")).toEqual([]);
  });

  it("returns empty for empty string", () => {
    expect(parseVtt("")).toEqual([]);
  });
});
