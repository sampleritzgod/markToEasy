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

export function ChatApp() {
  const { data: session } = useSession();
  const [question, setQuestion] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
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
    setMessages(data.chat.messages);
    setSources([]);
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (!loading) return;

    setLoadingStep("searching");
    const rankingTimer = setTimeout(() => setLoadingStep("ranking"), 1200);
    const generatingTimer = setTimeout(() => setLoadingStep("generating"), 2400);

    return () => {
      clearTimeout(rankingTimer);
      clearTimeout(generatingTimer);
    };
  }, [loading]);

  function handleNewChat() {
    setActiveChatId(null);
    setMessages([]);
    setSources([]);
    setQuestion("");
    setError(null);
    setPendingQuestion(null);
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
    setSources([]);
    setError(null);
    setPendingQuestion(null);
    loadChat(chatId);
  }

  async function submitQuestion(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setSources([]);
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

      const data = (await response.json()) as {
        answer?: string;
        chunks?: Source[];
        chatId?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Request failed");
      }

      setSources(data.chunks ?? []);

      if (data.chatId) {
        setActiveChatId(data.chatId);
        await loadChat(data.chatId);
        await loadChats();
      } else {
        setMessages((current) => [
          ...current,
          { id: `user-${Date.now()}`, role: "user", content: trimmed },
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.answer ?? "",
            lesson: data.chunks?.[0]?.lesson ?? null,
            timestamp: data.chunks?.[0]
              ? `${data.chunks[0].startTimestamp} --> ${data.chunks[0].endTimestamp}`
              : null,
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setQuestion(trimmed);
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

  const lastAssistantIndex = displayMessages.reduce(
    (acc, msg, i) => (msg.role === "assistant" ? i : acc),
    -1,
  );

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

        <div className="flex-1 overflow-y-auto">
          {!hasMessages && !loading ? (
            <EmptyState
              isLoggedIn={!!session}
              onLogin={() => signIn("google")}
              onSelectPrompt={setQuestion}
            />
          ) : (
            <div className="pb-4 pt-2">
              {displayMessages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  lesson={message.lesson}
                  timestamp={message.timestamp}
                  sources={
                    message.role === "assistant" &&
                    index === lastAssistantIndex &&
                    sources.length > 0
                      ? sources
                      : undefined
                  }
                />
              ))}
              {loading && <LoadingState step={loadingStep} />}
            </div>
          )}

          {error && (
            <div className="px-4 py-2">
              <p className="mx-auto max-w-3xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
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
