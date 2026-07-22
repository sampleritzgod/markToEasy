"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type { ChatSummary } from "@/components/chat/types";
import { relativeTime } from "@/lib/chat-ui";
import { cn } from "@/lib/utils";

type ChatItemProps = {
  chat: ChatSummary;
  active: boolean;
  collapsed?: boolean;
  onSelect: (chatId: string) => void;
  onDelete?: (chatId: string) => void;
  onRename?: (chatId: string, title: string) => void;
};

export function ChatItem({
  chat,
  active,
  collapsed,
  onSelect,
  onDelete,
  onRename,
}: ChatItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(chat.title);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftTitle(chat.title);
  }, [chat.title]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setRenaming(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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

  async function commitRename() {
    const next = draftTitle.trim();
    setRenaming(false);
    setMenuOpen(false);
    if (!next || next === chat.title || !onRename) {
      setDraftTitle(chat.title);
      return;
    }
    onRename(chat.id, next);
  }

  return (
    <div
      className={cn(
        "group relative flex items-center gap-1 rounded-xl px-2 py-1 transition-colors",
        active ? "bg-muted" : "hover:bg-muted/60",
      )}
    >
      {renaming ? (
        <form
          className="min-w-0 flex-1 px-1 py-1"
          onSubmit={(event) => {
            event.preventDefault();
            void commitRename();
          }}
        >
          <input
            autoFocus
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={() => void commitRename()}
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Rename chat"
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(chat.id)}
          className="min-w-0 flex-1 px-1 py-1.5 text-left"
        >
          <p
            className={cn(
              "truncate text-sm",
              active ? "font-medium text-foreground" : "text-foreground/90",
            )}
          >
            {chat.title}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {relativeTime(chat.updatedAt)}
          </p>
        </button>
      )}

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-card hover:text-foreground group-hover:opacity-100 focus:opacity-100"
          aria-label="Chat options"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-sm"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
              onClick={() => {
                setRenaming(true);
                setMenuOpen(false);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-muted"
              onClick={() => {
                setMenuOpen(false);
                if (
                  onDelete &&
                  window.confirm(`Delete “${chat.title}”? This cannot be undone.`)
                ) {
                  onDelete(chat.id);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
