import { getQdrantClient } from "./client";
import { COLLECTION_NAME, EMBEDDING_SIZE } from "./types";

export async function createCollection(): Promise<void> {
  const client = getQdrantClient();
  const collections = await client.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

  if (exists) return;

  await client.createCollection(COLLECTION_NAME, {
    vectors: {
      size: EMBEDDING_SIZE,
      distance: "Cosine",
    },
  });
}
