export type SemanticSearchResult = {
  lesson: string;
  startTimestamp: string;
  endTimestamp: string;
  text: string;
  score: number;
};

export const DEFAULT_LIMIT = 5;
