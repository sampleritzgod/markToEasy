export const COLLECTION_NAME = "course-transcripts";
export const EMBEDDING_SIZE = 1536;

export type ChunkPayload = {
  lesson: string;
  startTimestamp: string;
  endTimestamp: string;
  text: string;
};

export type InsertChunkInput = {
  id: string;
  embedding: number[];
  lesson: string;
  startTimestamp: string;
  endTimestamp: string;
  text: string;
};

export type SearchResult = {
  id: string | number;
  score: number;
  lesson: string;
  startTimestamp: string;
  endTimestamp: string;
  text: string;
};
