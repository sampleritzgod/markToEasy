/** Strip VTT/SRT inline tags and cue settings leftover on text lines. */
export function cleanSubtitleText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, "")
    .replace(/\{[^}]+\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
