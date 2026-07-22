import { readFile } from "fs/promises";
import path from "path";

import { discoverSubtitleFiles } from "./discover";
import { parseSrt } from "./srt";
import type { SubtitleEntry } from "./types";
import { parseVtt } from "./vtt";

const DEFAULT_SUBTITLES_DIR = path.join(process.cwd(), "data", "subtitles");

export async function ingestSubtitles(
  subtitlesDir: string = DEFAULT_SUBTITLES_DIR,
): Promise<SubtitleEntry[]> {
  const files = await discoverSubtitleFiles(subtitlesDir);
  const entries: SubtitleEntry[] = [];

  for (const file of files) {
    const content = await readFile(file.absolutePath, "utf-8");
    const cues = file.format === "srt" ? parseSrt(content) : parseVtt(content);

    for (const cue of cues) {
      entries.push({
        lessonName: file.lessonName,
        text: cue.text,
        startTimestamp: cue.startTimestamp,
        endTimestamp: cue.endTimestamp,
      });
    }
  }

  return entries;
}
