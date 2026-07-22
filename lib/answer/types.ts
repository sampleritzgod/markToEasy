import type { SemanticSearchResult } from "@/lib/search";

export type GenerateAnswerInput = {
  question: string;
  chunks: SemanticSearchResult[];
};
