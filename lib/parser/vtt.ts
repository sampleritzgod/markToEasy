import { parseTimestampLine } from "./timestamps";
import { cleanSubtitleText } from "./text";
import type { Cue } from "./types";

export function parseVtt(content: string): Cue[] {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

  const withoutHeader = normalized
    .replace(/^WEBVTT[^\n]*\n?/i, "")
    .replace(/^(NOTE|STYLE|REGION)[\s\S]*?(?=\n\n|\n*$)/gim, "")
    .trim();

  const blocks = withoutHeader
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const cues: Cue[] = [];

  for (const block of blocks) {
    if (/^(NOTE|STYLE|REGION)\b/i.test(block)) continue;

    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    const timingIndex = lines.findIndex((line) => parseTimestampLine(line));
    if (timingIndex === -1) continue;

    const timing = parseTimestampLine(lines[timingIndex]);
    if (!timing) continue;

    const text = cleanSubtitleText(lines.slice(timingIndex + 1).join(" "));
    if (!text) continue;

    cues.push({
      text,
      startTimestamp: timing.start,
      endTimestamp: timing.end,
    });
  }

  return cues;
}
