import type { ChatGroup, ChatSummary } from "@/components/chat/types";

export function relativeTime(dateString: string): string {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function groupChatsByDate(chats: ChatSummary[]): ChatGroup[] {
  const now = new Date();
  const today = startOfDay(now).getTime();
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  const groups: Record<string, ChatSummary[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  for (const chat of chats) {
    const time = new Date(chat.updatedAt).getTime();
    if (time >= today) groups.Today.push(chat);
    else if (time >= yesterday) groups.Yesterday.push(chat);
    else if (time >= weekAgo) groups["Previous 7 Days"].push(chat);
    else groups.Older.push(chat);
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, chats: items }));
}

export function getChatTitle(chats: ChatSummary[], activeChatId: string | null): string {
  if (!activeChatId) return "New conversation";
  return chats.find((c) => c.id === activeChatId)?.title ?? "Conversation";
}

export function formatCitation(source: {
  lesson: string;
  startTimestamp: string;
  endTimestamp: string;
}): string {
  return `${source.lesson} (${source.startTimestamp} → ${source.endTimestamp})`;
}
