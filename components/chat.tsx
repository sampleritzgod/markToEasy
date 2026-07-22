"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { AnswerCard } from "@/components/answer-card";
import { ChatSidebar, type ChatSummary } from "@/components/chat-sidebar";
import { Header } from "@/components/header";
import { MessageThread, type ThreadMessage } from "@/components/message-thread";
import { SourcesCard, type Source } from "@/components/sources-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Chat() {
  const { data: session } = useSession();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setAnswer(null);
    setSources([]);
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  function handleNewChat() {
    setActiveChatId(null);
    setMessages([]);
    setAnswer(null);
    setSources([]);
    setQuestion("");
    setError(null);
  }

  function handleSelectChat(chatId: string) {
    setActiveChatId(chatId);
    setAnswer(null);
    setSources([]);
    setError(null);
    loadChat(chatId);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = question.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);

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

      setAnswer(data.answer ?? null);
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

      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const showThread = session && messages.length > 0;
  const showLatestAnswer = !session && answer;

  return (
    <div className="flex min-h-screen">
      {session && (
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
        />
      )}

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
        <Header />

        {showThread && <MessageThread messages={messages} />}

        <form className="flex gap-3" onSubmit={handleSubmit}>
          <Input
            type="text"
            placeholder="Ask about Expo, React Native, navigation..."
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={loading}
            className="h-11"
          />
          <Button type="submit" disabled={loading || !question.trim()} className="h-11 px-6">
            Ask
          </Button>
        </form>

        {loading && (
          <p className="text-sm text-muted-foreground">
            Searching transcripts and generating answer...
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {showLatestAnswer && <AnswerCard answer={answer} />}

        {!loading && !session && sources.length > 0 && <SourcesCard sources={sources} />}
      </div>
    </div>
  );
}
