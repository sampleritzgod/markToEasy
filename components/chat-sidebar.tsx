"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ChatSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

type ChatSidebarProps = {
  chats: ChatSummary[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
};

export function ChatSidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
}: ChatSidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-muted/30">
      <div className="border-b p-4">
        <Button variant="outline" className="w-full" onClick={onNewChat}>
          New chat
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {chats.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">No chats yet.</p>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelectChat(chat.id)}
              className={cn(
                "mb-1 w-full rounded-md px-3 py-2 text-left text-sm",
                activeChatId === chat.id
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:bg-background/70",
              )}
            >
              <span className="line-clamp-2">{chat.title}</span>
            </button>
          ))
        )}
      </nav>
    </aside>
  );
}
