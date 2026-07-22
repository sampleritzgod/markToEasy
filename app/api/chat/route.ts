import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { generateAnswer } from "@/lib/answer";
import { saveChatMessages } from "@/lib/chat/save-messages";
import { semanticSearch } from "@/lib/search";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      query?: string;
      question?: string;
      chatId?: string;
    };
    const question = (body.question ?? body.query)?.trim();

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const chunks = await semanticSearch(question);
    const answer = await generateAnswer({ question, chunks });

    const session = await auth();
    let chatId: string | undefined;

    if (session?.user?.id) {
      chatId = await saveChatMessages({
        userId: session.user.id,
        chatId: body.chatId,
        question,
        answer,
        chunks,
      });
    }

    return NextResponse.json({ answer, chunks, chatId });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
  }
}
