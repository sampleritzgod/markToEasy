import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  LEARNING_RATE_LIMIT,
  consumeRateLimit,
  normalizeQuestion,
  rateLimitHeaders,
} from "@/lib/api/request-guards";
import {
  ComicRenderIncompleteError,
  LearningSessionValidationError,
  runLearningSession,
} from "@/lib/learning";

/** Comic pipeline can take several minutes (LLM steps + image generation). */
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Sign in required to generate a learning comic" },
        { status: 401 },
      );
    }

    const userId = session.user.id;
    const rate = consumeRateLimit(`learning:${userId}`, LEARNING_RATE_LIMIT);
    const headers = rateLimitHeaders(rate, LEARNING_RATE_LIMIT);

    if (!rate.ok) {
      return NextResponse.json(
        {
          error: "Learning rate limit exceeded. Try again later.",
          retryAfterSec: rate.retryAfterSec,
        },
        { status: 429, headers },
      );
    }

    const body = (await request.json()) as { question?: string; query?: string };
    const normalized = normalizeQuestion(body.question ?? body.query);
    if (!normalized.ok) {
      return NextResponse.json(
        { error: normalized.error },
        { status: normalized.status, headers },
      );
    }

    const sessionResult = await runLearningSession(normalized.question);

    return NextResponse.json(
      { session: sessionResult },
      { headers },
    );
  } catch (error) {
    if (error instanceof LearningSessionValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          validation: error.validation,
        },
        { status: 422 },
      );
    }

    if (error instanceof ComicRenderIncompleteError) {
      return NextResponse.json(
        {
          error: error.message,
          renderedComic: error.renderedComic,
          failedPanelIds: error.summary.failedPanels.map((panel) => panel.id),
        },
        { status: 502 },
      );
    }

    console.error("Learning API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate learning session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
