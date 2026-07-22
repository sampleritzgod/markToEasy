import { describe, expect, it } from "vitest";

import { normalizeTimestamp, parseTimestampLine } from "./timestamps";

describe("normalizeTimestamp", () => {
  it("normalizes SRT comma millis", () => {
    expect(normalizeTimestamp("00:01:02,345")).toBe("00:01:02.345");
  });

  it("normalizes VTT MM:SS.mmm", () => {
    expect(normalizeTimestamp("1:02.3")).toBe("00:01:02.300");
  });

  it("pads short millis", () => {
    expect(normalizeTimestamp("01:02:03.5")).toBe("01:02:03.500");
  });

  it("trims whitespace", () => {
    expect(normalizeTimestamp("  00:00:01.000  ")).toBe("00:00:01.000");
  });

  it("throws on empty string", () => {
    expect(() => normalizeTimestamp("")).toThrow(/Invalid timestamp/);
  });

  it("throws on invalid format", () => {
    expect(() => normalizeTimestamp("not-a-time")).toThrow(/Invalid timestamp/);
  });

  it("throws on null-like coercion", () => {
    expect(() => normalizeTimestamp("null")).toThrow(/Invalid timestamp/);
  });
});

describe("parseTimestampLine", () => {
  it("parses SRT arrow line", () => {
    expect(parseTimestampLine("00:00:01,000 --> 00:00:02,500")).toEqual({
      start: "00:00:01.000",
      end: "00:00:02.500",
    });
  });

  it("parses VTT short form", () => {
    expect(parseTimestampLine("1:00.000 --> 1:05.500")).toEqual({
      start: "00:01:00.000",
      end: "00:01:05.500",
    });
  });

  it("returns null for non-timing lines", () => {
    expect(parseTimestampLine("WEBVTT")).toBeNull();
    expect(parseTimestampLine("")).toBeNull();
    expect(parseTimestampLine("1")).toBeNull();
  });
});
