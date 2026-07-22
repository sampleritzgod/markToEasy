import { parseTimestampLine } from "./timestamps";
import { cleanSubtitleText } from "./text";
import type { Cue } from "./types";

export function parseSrt(content: string): Cue[] {
  const blocks = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const cues: Cue[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trim());
    if (lines.length < 2) continue;

    let offset = 0;
    if (/^\d+$/.test(lines[0])) {
      offset = 1;
    }

    const timing = parseTimestampLine(lines[offset] ?? "");
    if (!timing) continue;

    const text = cleanSubtitleText(lines.slice(offset + 1).join(" "));
    if (!text) continue;

    cues.push({
      text,
      startTimestamp: timing.start,
      endTimestamp: timing.end,
    });
  }

  return cues;
}
