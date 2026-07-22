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
};

export type ThreadMessage = {
  id: string;
  role: string;
  content: string;
  lesson?: string | null;
  timestamp?: string | null;
};

export type LoadingStep = "searching" | "ranking" | "generating";

export type ChatGroup = {
  label: string;
  chats: ChatSummary[];
};
