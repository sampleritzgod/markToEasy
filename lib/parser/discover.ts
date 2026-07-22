import { readdir } from "fs/promises";
import path from "path";

import type { SubtitleFormat } from "./types";

export type SubtitleFile = {
  absolutePath: string;
  lessonName: string;
  format: SubtitleFormat;
};

const SUBTITLE_EXTENSIONS = new Set([".srt", ".vtt"]);

export async function discoverSubtitleFiles(rootDir: string): Promise<SubtitleFile[]> {
  const files: SubtitleFile[] = [];
  await walk(rootDir, rootDir, files);
  return dedupeByLesson(files).sort((a, b) => a.absolutePath.localeCompare(b.absolutePath));
}

async function walk(rootDir: string, dir: string, files: SubtitleFile[]): Promise<void> {
  let entries;

  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (isMissingDirectory(error)) return;
    throw error;
  }

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(rootDir, absolutePath, files);
      continue;
    }

    if (!entry.isFile()) continue;

    const extension = path.extname(entry.name).toLowerCase();
    if (!SUBTITLE_EXTENSIONS.has(extension)) continue;

    files.push({
      absolutePath,
      lessonName: path.relative(rootDir, path.dirname(absolutePath)),
      format: extension === ".srt" ? "srt" : "vtt",
    });
  }
}

/** Prefer VTT when both SRT and VTT exist for the same lesson. */
function dedupeByLesson(files: SubtitleFile[]): SubtitleFile[] {
  const byLesson = new Map<string, SubtitleFile>();

  for (const file of files) {
    const key = path.join(path.dirname(file.absolutePath), path.parse(path.basename(file.absolutePath)).name);
    const existing = byLesson.get(key);

    if (!existing || (existing.format === "srt" && file.format === "vtt")) {
      byLesson.set(key, file);
    }
  }

  return Array.from(byLesson.values());
}

function isMissingDirectory(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "ENOENT"
  );
}
