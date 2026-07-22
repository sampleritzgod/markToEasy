import { embed } from "@/lib/embeddings";
import { search } from "@/lib/vector";

import { DEFAULT_LIMIT, type SemanticSearchResult } from "./types";

export async function semanticSearch(
  query: string,
  limit: number = DEFAULT_LIMIT,
): Promise<SemanticSearchResult[]> {
  const embedding = await embed(query);
  const results = await search(embedding, limit);

  return results.map((result) => ({
    lesson: result.lesson,
    startTimestamp: result.startTimestamp,
    endTimestamp: result.endTimestamp,
    text: result.text,
    score: result.score,
  }));
}
