/**
 * Normalize SRT (HH:MM:SS,mmm) and VTT (HH:MM:SS.mmm or MM:SS.mmm) timestamps
 * to a consistent HH:MM:SS.mmm string.
 */
export function normalizeTimestamp(raw: string): string {
  const cleaned = raw.trim().replace(",", ".");

  const match = cleaned.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})\.(\d{1,3})$/);
  if (!match) {
    throw new Error(`Invalid timestamp: ${raw}`);
  }

  const hours = Number(match[1] ?? "0");
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const millis = match[4].padEnd(3, "0");

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":") + `.${millis}`;
}

const TIMESTAMP_LINE =
  /^(\d{1,2}:\d{1,2}:\d{1,2}[.,]\d{1,3}|\d{1,2}:\d{1,2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{1,2}:\d{1,2}[.,]\d{1,3}|\d{1,2}:\d{1,2}[.,]\d{1,3})/;

export function parseTimestampLine(line: string): { start: string; end: string } | null {
  const match = line.trim().match(TIMESTAMP_LINE);
  if (!match) return null;

  return {
    start: normalizeTimestamp(match[1]),
    end: normalizeTimestamp(match[2]),
  };
}
