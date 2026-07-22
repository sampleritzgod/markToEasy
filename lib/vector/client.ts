import { createHash } from "crypto";

import { QdrantClient } from "@qdrant/js-client-rest";

let client: QdrantClient | null = null;

export function getQdrantClient(): QdrantClient {
  if (client) return client;

  const url = process.env.QDRANT_URL ?? "http://127.0.0.1:6333";
  const apiKey = process.env.QDRANT_API_KEY;

  client = new QdrantClient({
    url,
    ...(apiKey ? { apiKey } : {}),
  });

  return client;
}

/** Qdrant point IDs must be UUID or unsigned integer. */
export function toPointId(id: string): string {
  const hash = createHash("sha256").update(id).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}
