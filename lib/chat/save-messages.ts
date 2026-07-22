import { generateChatTitle } from "@/lib/chat/generate-title";
import type { SemanticSearchResult } from "@/lib/search";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

function formatTimestamp(chunks: SemanticSearchResult[]): string | null {
  const first = chunks[0];
  if (!first) return null;
  return `${first.startTimestamp} --> ${first.endTimestamp}`;
}

function serializeSources(chunks: SemanticSearchResult[]): Prisma.InputJsonValue {
  return chunks.map((chunk) => ({
    lesson: chunk.lesson,
    startTimestamp: chunk.startTimestamp,
    endTimestamp: chunk.endTimestamp,
    text: chunk.text,
    score: chunk.score,
    chunkId: chunk.chunkId ?? null,
  }));
}

export async function saveChatMessages(input: {
  userId: string;
  chatId?: string;
  question: string;
  answer: string;
  chunks: SemanticSearchResult[];
}) {
  const { userId, chatId, question, answer, chunks } = input;

  let activeChat = null;

  if (chatId) {
    activeChat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });
  }

  if (!activeChat) {
    const title = await generateChatTitle(question);

    activeChat = await prisma.chat.create({
      data: {
        userId,
        title,
      },
    });
  }

  await prisma.message.createMany({
    data: [
      {
        chatId: activeChat.id,
        role: "user",
        content: question,
      },
      {
        chatId: activeChat.id,
        role: "assistant",
        content: answer,
        lesson: chunks[0]?.lesson ?? null,
        timestamp: formatTimestamp(chunks),
        sources: serializeSources(chunks),
      },
    ],
  });

  await prisma.chat.update({
    where: { id: activeChat.id },
    data: { updatedAt: new Date() },
  });

  return activeChat.id;
}
