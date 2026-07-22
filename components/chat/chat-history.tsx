"use client";

import { ChatItem } from "@/components/chat/chat-item";
import type { ChatSummary } from "@/components/chat/types";
import { groupChatsByDate } from "@/lib/chat-ui";

type ChatHistoryProps = {
  chats: ChatSummary[];
  activeChatId: string | null;
  collapsed: boolean;
  searchQuery: string;
  onSelectChat: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onRenameChat?: (chatId: string, title: string) => void;
};

export function ChatHistory({
  chats,
  activeChatId,
  collapsed,
  searchQuery,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
}: ChatHistoryProps) {
  const filtered = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const groups = groupChatsByDate(filtered);

  if (collapsed) {
    return (
      <div className="space-y-1">
        {filtered.slice(0, 8).map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            active={activeChatId === chat.id}
            collapsed
            onSelect={onSelectChat}
          />
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return <p className="px-3 py-2 text-xs text-muted-foreground">No chats found.</p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.chats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                active={activeChatId === chat.id}
                onSelect={onSelectChat}
                onDelete={onDeleteChat}
                onRename={onRenameChat}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
