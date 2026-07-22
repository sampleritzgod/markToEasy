export type Chunk = {
  id: string;
  lesson: string;
  startTimestamp: string;
  endTimestamp: string;
  text: string;
};

export const DEFAULT_TARGET_WORDS = 250;
