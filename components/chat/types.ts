export type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

export type Source = {
  lesson: string;
  startTimestamp: string;
  endTimestamp: string;
  text: string;
  score: number;
  chunkId?: string | null;
};

export type ThreadMessage = {
  id: string;
  role: string;
  content: string;
  lesson?: string | null;
  timestamp?: string | null;
  sources?: Source[] | null;
  createdAt?: string;
};

export type LoadingStep = "resolving" | "searching" | "generating" | "saving";

export type ChatGroup = {
  label: string;
  chats: ChatSummary[];
};
