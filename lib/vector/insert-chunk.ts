import { getQdrantClient, toPointId } from "./client";
import { COLLECTION_NAME, type InsertChunkInput } from "./types";

export async function insertChunk(input: InsertChunkInput): Promise<void> {
  const client = getQdrantClient();

  await client.upsert(COLLECTION_NAME, {
    wait: true,
    points: [
      {
        id: toPointId(input.id),
        vector: input.embedding,
        payload: {
          lesson: input.lesson,
          startTimestamp: input.startTimestamp,
          endTimestamp: input.endTimestamp,
          text: input.text,
          chunkId: input.id,
        },
      },
    ],
  });
}
