import { getQdrantClient } from "./client";
import { COLLECTION_NAME, type SearchResult } from "./types";

export async function search(
  embedding: number[],
  limit: number = 5,
): Promise<SearchResult[]> {
  const client = getQdrantClient();

  const results = await client.search(COLLECTION_NAME, {
    vector: embedding,
    limit,
    with_payload: true,
  });

  return results.map((result) => {
    const payload = (result.payload ?? {}) as Record<string, unknown>;

    return {
      id: result.id,
      score: result.score,
      lesson: String(payload.lesson ?? ""),
      startTimestamp: String(payload.startTimestamp ?? ""),
      endTimestamp: String(payload.endTimestamp ?? ""),
      text: String(payload.text ?? ""),
      chunkId: payload.chunkId ? String(payload.chunkId) : undefined,
    };
  });
}
