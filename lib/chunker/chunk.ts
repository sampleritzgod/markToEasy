import type { SubtitleEntry } from "@/lib/parser";

import { DEFAULT_TARGET_WORDS, type Chunk } from "./types";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function endsWithSentence(text: string): boolean {
  return /[.!?]["']?\s*$/.test(text.trim());
}

function joinText(entries: SubtitleEntry[]): string {
  return entries.map((entry) => entry.text).join(" ");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function makeChunk(lesson: string, entries: SubtitleEntry[], index: number): Chunk {
  return {
    id: `${slugify(lesson)}-${index}`,
    lesson,
    startTimestamp: entries[0].startTimestamp,
    endTimestamp: entries[entries.length - 1].endTimestamp,
    text: joinText(entries),
  };
}

function chunkLesson(
  lesson: string,
  entries: SubtitleEntry[],
  targetWords: number,
  startIndex: number,
): { chunks: Chunk[]; nextIndex: number } {
  const chunks: Chunk[] = [];
  let buffer: SubtitleEntry[] = [];
  let index = startIndex;

  for (const entry of entries) {
    buffer.push(entry);
    const text = joinText(buffer);
    const words = countWords(text);

    if (words >= targetWords && endsWithSentence(text)) {
      chunks.push(makeChunk(lesson, buffer, index++));
      buffer = [];
    }
  }

  if (buffer.length > 0) {
    chunks.push(makeChunk(lesson, buffer, index++));
  }

  return { chunks, nextIndex: index };
}

export function chunkSubtitles(
  entries: SubtitleEntry[],
  targetWords: number = DEFAULT_TARGET_WORDS,
): Chunk[] {
  const byLesson = new Map<string, SubtitleEntry[]>();

  for (const entry of entries) {
    const lessonEntries = byLesson.get(entry.lessonName) ?? [];
    lessonEntries.push(entry);
    byLesson.set(entry.lessonName, lessonEntries);
  }

  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const [lesson, lessonEntries] of [...byLesson.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const result = chunkLesson(lesson, lessonEntries, targetWords, chunkIndex);
    chunks.push(...result.chunks);
    chunkIndex = result.nextIndex;
  }

  return chunks;
}
