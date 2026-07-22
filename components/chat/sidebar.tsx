"use client";

import Link from "next/link";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  Search,
  Sparkles,
} from "lucide-react";

import { ChatHistory } from "@/components/chat/chat-history";
import type { ChatSummary } from "@/components/chat/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type SidebarProps = {
  chats: ChatSummary[];
  activeChatId: string | null;
  collapsed: boolean;
  mobileOpen: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onRenameChat?: (chatId: string, title: string) => void;
  onNewChat: () => void;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onOpenProfile: () => void;
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  isLoggedIn: boolean;
  onLogin: () => void;
};

export function Sidebar({
  chats,
  activeChatId,
  collapsed,
  mobileOpen,
  searchQuery,
  onSearchChange,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onNewChat,
  onToggleCollapse,
  onCloseMobile,
  onOpenProfile,
  userName,
  userEmail,
  userImage,
  isLoggedIn,
  onLogin,
}: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={cn(
          "fixed z-50 flex h-full flex-col border-r border-border bg-sidebar transition-all duration-200 md:static md:z-auto",
          collapsed ? "w-[72px]" : "w-[280px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold tracking-tight">MarkToEasy</span>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className="space-y-3 p-3">
          <button
            type="button"
            onClick={onNewChat}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted",
              collapsed && "justify-center px-2",
            )}
          >
            <MessageSquarePlus className="h-4 w-4 shrink-0 text-primary" />
            {!collapsed && "New chat"}
          </button>

          <Link
            href="/learning"
            onClick={onCloseMobile}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted",
              collapsed && "justify-center px-2",
            )}
            title="Learning comic"
          >
            <BookOpen className="h-4 w-4 shrink-0 text-primary" />
            {!collapsed && "Learning comic"}
          </Link>

          {isLoggedIn && !collapsed && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search chats"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {isLoggedIn ? (
            <ChatHistory
              chats={chats}
              activeChatId={activeChatId}
              collapsed={collapsed}
              searchQuery={searchQuery}
              onSelectChat={(id) => {
                onSelectChat(id);
                onCloseMobile();
              }}
              onDeleteChat={onDeleteChat}
              onRenameChat={onRenameChat}
            />
          ) : (
            !collapsed && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Sign in to save and search your chat history.
              </p>
            )
          )}
        </div>

        <div className="border-t border-border p-3 space-y-3">
          {!collapsed && <ThemeToggle compact />}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted",
                collapsed && "justify-center",
              )}
            >
              {userImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userImage}
                  alt={userName ? `${userName} avatar` : "User avatar"}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {(userName?.[0] ?? userEmail?.[0] ?? "U").toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{userName ?? "User"}</p>
                  <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                </div>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="w-full rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {collapsed ? "In" : "Sign in with Google"}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
