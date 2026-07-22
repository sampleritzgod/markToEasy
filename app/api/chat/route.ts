import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  CHAT_RATE_LIMIT,
  consumeRateLimit,
  normalizeQuestion,
  rateLimitHeaders,
} from "@/lib/api/request-guards";
import { generateAnswer } from "@/lib/answer";
import { saveChatMessages } from "@/lib/chat/save-messages";
import { prisma } from "@/lib/db";
import { resolveContext } from "@/lib/learning/context-manager";
import type { ConversationMessage } from "@/lib/learning/types";
import { semanticSearch } from "@/lib/search";

type ChatStreamEvent =
  | { type: "status"; step: "resolving" | "searching" | "generating" | "saving" }
  | {
      type: "result";
      answer: string;
      chunks: Awaited<ReturnType<typeof semanticSearch>>;
      chatId: string;
      resolvedQuestion: string;
    }
  | { type: "error"; error: string };

function encodeEvent(event: ChatStreamEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Sign in required to ask questions" },
      { status: 401 },
    );
  }

  const userId = session.user.id;
  const rate = consumeRateLimit(`chat:${userId}`, CHAT_RATE_LIMIT);
  const rateHeaders = rateLimitHeaders(rate, CHAT_RATE_LIMIT);

  if (!rate.ok) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Try again later.",
        retryAfterSec: rate.retryAfterSec,
      },
      { status: 429, headers: rateHeaders },
    );
  }

  let body: {
    query?: string;
    question?: string;
    chatId?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: rateHeaders },
    );
  }

  const normalized = normalizeQuestion(body.question ?? body.query);
  if (!normalized.ok) {
    return NextResponse.json(
      { error: normalized.error },
      { status: normalized.status, headers: rateHeaders },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ChatStreamEvent) => {
        controller.enqueue(encoder.encode(encodeEvent(event)));
      };

      try {
        let question = normalized.question;

        if (body.chatId) {
          const existing = await prisma.chat.findFirst({
            where: { id: body.chatId, userId },
            include: {
              messages: {
                orderBy: { createdAt: "asc" },
                take: 20,
                select: { role: true, content: true },
              },
            },
          });

          if (existing && existing.messages.length > 0) {
            send({ type: "status", step: "resolving" });
            const historyMessages: ConversationMessage[] = existing.messages
              .filter(
                (message): message is { role: "user" | "assistant"; content: string } =>
                  message.role === "user" || message.role === "assistant",
              )
              .map((message) => ({
                role: message.role,
                content: message.content,
              }));

            const context = await resolveContext(question, {
              messages: historyMessages,
              previousSession: null,
            });
            question = context.resolvedQuestion;
          }
        }

        send({ type: "status", step: "searching" });
        const chunks = await semanticSearch(question);

        send({ type: "status", step: "generating" });
        const answer = await generateAnswer({ question, chunks });

        send({ type: "status", step: "saving" });
        const chatId = await saveChatMessages({
          userId,
          chatId: body.chatId,
          question: normalized.question,
          answer,
          chunks,
        });

        send({
          type: "result",
          answer,
          chunks,
          chatId,
          resolvedQuestion: question,
        });
      } catch (error) {
        console.error("Chat API error:", error);
        send({
          type: "error",
          error:
            error instanceof Error ? error.message : "Failed to generate answer",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...rateHeaders,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
