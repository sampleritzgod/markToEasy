"use client";

import { MoreHorizontal } from "lucide-react";

import type { ChatSummary } from "@/components/chat/types";
import { relativeTime } from "@/lib/chat-ui";
import { cn } from "@/lib/utils";

type ChatItemProps = {
  chat: ChatSummary;
  active: boolean;
  collapsed?: boolean;
  onSelect: (chatId: string) => void;
};

export function ChatItem({ chat, active, collapsed, onSelect }: ChatItemProps) {
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => onSelect(chat.id)}
        title={chat.title}
        className={cn(
          "flex h-10 w-full items-center justify-center rounded-xl text-xs transition-colors",
          active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted",
        )}
      >
        {chat.title.charAt(0).toUpperCase()}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-1 rounded-xl px-2 py-1 transition-colors",
        active ? "bg-muted" : "hover:bg-muted/60",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(chat.id)}
        className="min-w-0 flex-1 px-1 py-1.5 text-left"
      >
        <p className={cn("truncate text-sm", active ? "font-medium text-foreground" : "text-foreground/90")}>
          {chat.title}
        </p>
        <p className="text-[11px] text-muted-foreground">{relativeTime(chat.updatedAt)}</p>
      </button>
      <button
        type="button"
        className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-card hover:text-foreground group-hover:opacity-100"
        aria-label="Chat options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
