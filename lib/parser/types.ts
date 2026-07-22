export type SubtitleFormat = "srt" | "vtt";

export type SubtitleEntry = {
  lessonName: string;
  text: string;
  startTimestamp: string;
  endTimestamp: string;
};

export type Cue = {
  text: string;
  startTimestamp: string;
  endTimestamp: string;
};
