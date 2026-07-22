"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";

import { EmptyState } from "@/components/chat/empty-state";
import { Header } from "@/components/chat/header";
import { getLoadingLabel, LoadingState } from "@/components/chat/loading-state";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ProfileDrawer } from "@/components/chat/profile-drawer";
import { PromptInput } from "@/components/chat/prompt-input";
import { Sidebar } from "@/components/chat/sidebar";
import type { ChatSummary, LoadingStep, Source, ThreadMessage } from "@/components/chat/types";
import { getChatTitle } from "@/lib/chat-ui";
import { Button } from "@/components/ui/button";

function normalizeSources(raw: unknown): Source[] | null {
  if (!Array.isArray(raw)) return null;
  return raw as Source[];
}

function normalizeMessages(raw: ThreadMessage[]): ThreadMessage[] {
  return raw.map((message) => ({
    ...message,
    sources: normalizeSources(message.sources),
    createdAt:
      typeof message.createdAt === "string"
        ? message.createdAt
        : message.createdAt
          ? new Date(message.createdAt).toISOString()
          : undefined,
  }));
}

type ChatStreamEvent =
  | { type: "status"; step: LoadingStep }
  | {
      type: "result";
      answer: string;
      chunks: Source[];
      chatId: string;
      resolvedQuestion?: string;
    }
  | { type: "error"; error: string };

async function readChatStream(
  response: Response,
  onStatus: (step: LoadingStep) => void,
): Promise<Extract<ChatStreamEvent, { type: "result" }>> {
  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: Extract<ChatStreamEvent, { type: "result" }> | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const event = JSON.parse(trimmed) as ChatStreamEvent;
      if (event.type === "status") {
        onStatus(event.step);
      } else if (event.type === "error") {
        throw new Error(event.error);
      } else if (event.type === "result") {
        result = event;
      }
    }
  }

  if (buffer.trim()) {
    const event = JSON.parse(buffer.trim()) as ChatStreamEvent;
    if (event.type === "error") throw new Error(event.error);
    if (event.type === "result") result = event;
    if (event.type === "status") onStatus(event.step);
  }

  if (!result) {
    throw new Error("Chat stream ended without a result");
  }

  return result;
}

export function ChatApp() {
  const { data: session } = useSession();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>("searching");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    if (!session) return;
    const response = await fetch("/api/chats");
    if (!response.ok) return;
    const data = (await response.json()) as { chats: ChatSummary[] };
    setChats(data.chats);
  }, [session]);

  const loadChat = useCallback(async (chatId: string) => {
    const response = await fetch(`/api/chats/${chatId}`);
    if (!response.ok) return;
    const data = (await response.json()) as { chat: { messages: ThreadMessage[] } };
    setMessages(normalizeMessages(data.chat.messages));
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
    }
    function handleOffline() {
      setOnline(false);
    }

    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function handleNewChat() {
    setActiveChatId(null);
    setMessages([]);
    setQuestion("");
    setError(null);
    setPendingQuestion(null);
    setLastFailedQuestion(null);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "n") {
        event.preventDefault();
        handleNewChat();
      }
      if (event.key === "Escape") {
        setProfileOpen(false);
        setMobileSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSelectChat(chatId: string) {
    setActiveChatId(chatId);
    setError(null);
    setPendingQuestion(null);
    setLastFailedQuestion(null);
    loadChat(chatId);
  }

  async function handleDeleteChat(chatId: string) {
    const response = await fetch(`/api/chats/${chatId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Failed to delete chat");
      return;
    }

    setChats((current) => current.filter((chat) => chat.id !== chatId));
    if (activeChatId === chatId) {
      handleNewChat();
    }
  }

  async function handleRenameChat(chatId: string, title: string) {
    const response = await fetch(`/api/chats/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Failed to rename chat");
      return;
    }

    setChats((current) =>
      current.map((chat) => (chat.id === chatId ? { ...chat, title } : chat)),
    );
  }

  async function submitQuestion(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (!session) {
      setError("Sign in required to ask questions");
      await signIn("google");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("You appear to be offline. Reconnect and try again.");
      setLastFailedQuestion(trimmed);
      setQuestion(trimmed);
      return;
    }

    setLoading(true);
    setLoadingStep(activeChatId && messages.length > 0 ? "resolving" : "searching");
    setError(null);
    setLastFailedQuestion(null);
    setPendingQuestion(trimmed);
    setQuestion("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          chatId: activeChatId ?? undefined,
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok || !contentType.includes("ndjson")) {
        const data = (await response.json()) as {
          error?: string;
          retryAfterSec?: number;
        };

        if (response.status === 401) {
          throw new Error(data.error ?? "Sign in required to ask questions");
        }
        if (response.status === 429) {
          throw new Error(
            data.error ??
              `Rate limit exceeded. Try again in ${data.retryAfterSec ?? "a few"} seconds.`,
          );
        }
        throw new Error(data.error ?? "Request failed");
      }

      const result = await readChatStream(response, setLoadingStep);
      setActiveChatId(result.chatId);
      await loadChat(result.chatId);
      await loadChats();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setQuestion(trimmed);
      setLastFailedQuestion(trimmed);
    } finally {
      setLoading(false);
      setPendingQuestion(null);
    }
  }

  const displayMessages = [...messages];
  if (pendingQuestion) {
    displayMessages.push({
      id: "pending-user",
      role: "user",
      content: pendingQuestion,
    });
  }

  const hasMessages = displayMessages.length > 0;
  const chatTitle = getChatTitle(chats, activeChatId);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        searchQuery={chatSearch}
        onSearchChange={setChatSearch}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onNewChat={handleNewChat}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenProfile={() => setProfileOpen(true)}
        userName={session?.user?.name}
        userEmail={session?.user?.email}
        userImage={session?.user?.image}
        isLoggedIn={!!session}
        onLogin={() => signIn("google")}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          title={chatTitle}
          loading={loading}
          loadingLabel={loading ? getLoadingLabel(loadingStep) : undefined}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
        />

        {!online && (
          <div
            className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-100"
            role="status"
          >
            You are offline. Messages will not send until the connection returns.
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {!hasMessages && !loading ? (
            <EmptyState
              isLoggedIn={!!session}
              onLogin={() => signIn("google")}
              onSelectPrompt={setQuestion}
            />
          ) : (
            <div className="pb-4 pt-2">
              {displayMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  lesson={message.lesson}
                  timestamp={message.timestamp}
                  sources={message.role === "assistant" ? message.sources : undefined}
                  createdAt={message.createdAt}
                />
              ))}
              {loading && <LoadingState step={loadingStep} />}
            </div>
          )}

          {error && (
            <div className="px-4 py-2">
              <div
                className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                role="alert"
              >
                <p>{error}</p>
                {lastFailedQuestion && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => submitQuestion(lastFailedQuestion)}
                    disabled={loading || !online}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <PromptInput
          value={question}
          loading={loading}
          onChange={setQuestion}
          onSubmit={() => submitQuestion(question)}
        />
      </div>

      {session && (
        <ProfileDrawer
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          name={session.user?.name}
          email={session.user?.email}
          image={session.user?.image}
        />
      )}
    </div>
  );
}
