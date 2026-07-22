import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  LEARNING_RATE_LIMIT,
  consumeRateLimit,
  normalizeQuestion,
  rateLimitHeaders,
} from "@/lib/api/request-guards";
import { adaptExplanation, type AdaptationSession } from "@/lib/learning";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Sign in required to adapt a lesson" },
        { status: 401 },
      );
    }

    const rate = consumeRateLimit(
      `learning-adapt:${session.user.id}`,
      LEARNING_RATE_LIMIT,
    );
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

    const body = (await request.json()) as {
      feedback?: string;
      session?: AdaptationSession;
    };

    const normalized = normalizeQuestion(body.feedback);
    if (!normalized.ok) {
      return NextResponse.json(
        { error: "Feedback is required" },
        { status: 400, headers },
      );
    }

    if (!body.session) {
      return NextResponse.json(
        { error: "Lesson session is required" },
        { status: 400, headers },
      );
    }

    const adaptation = await adaptExplanation(normalized.question, body.session);

    return NextResponse.json({ adaptation }, { headers });
  } catch (error) {
    console.error("Learning adapt API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to adapt lesson";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
