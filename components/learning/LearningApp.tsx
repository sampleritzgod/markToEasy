"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { ArrowLeft, Loader2 } from "lucide-react";

import { LearningViewer } from "@/components/learning/LearningViewer";
import { Button } from "@/components/ui/button";
import type { LearningSession, ValidationResult } from "@/lib/learning";

type GenerateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; session: LearningSession }
  | { status: "validation_failed"; message: string; validation: ValidationResult }
  | { status: "error"; message: string };

export function LearningApp() {
  const { data: authSession, status: authStatus } = useSession();
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<GenerateState>({ status: "idle" });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || state.status === "loading") return;

    if (!authSession) {
      await signIn("google");
      return;
    }

    setState({ status: "loading" });

    try {
      const response = await fetch("/api/learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      const data = (await response.json()) as {
        session?: LearningSession;
        error?: string;
        validation?: ValidationResult;
        retryAfterSec?: number;
      };

      if (response.status === 401) {
        setState({
          status: "error",
          message: data.error ?? "Sign in required to generate a learning comic",
        });
        return;
      }

      if (response.status === 429) {
        setState({
          status: "error",
          message:
            data.error ??
            `Rate limit exceeded. Try again in ${data.retryAfterSec ?? "a few"} seconds.`,
        });
        return;
      }

      if (response.status === 422 && data.validation) {
        setState({
          status: "validation_failed",
          message: data.error ?? "Lesson did not pass validation",
          validation: data.validation,
        });
        return;
      }

      if (response.status === 502) {
        throw new Error(
          data.error ?? "All comic panel images failed to generate. Please try again.",
        );
      }

      if (!response.ok || !data.session) {
        throw new Error(data.error ?? "Failed to generate learning session");
      }

      setState({ status: "ready", session: data.session });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Something went wrong",
      });
    }
  }

  function handleReset() {
    setState({ status: "idle" });
  }

  if (state.status === "ready") {
    const { session } = state;
    return (
      <div className="min-h-full bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 pt-4">
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            <ArrowLeft className="h-4 w-4" />
            Ask another
          </Button>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to chat
          </Link>
        </div>
        <LearningViewer
          plan={session.learningPlan}
          story={session.story}
          comicPlan={session.comicPlan}
          renderedComic={session.renderedComic}
          quiz={session.quiz}
        />
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center gap-6 px-4 py-12">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Learning comic
          </h1>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Chat
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Ask a question and MarkToEasy will plan a short educational comic lesson.
          This can take a few minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="learning-question" className="sr-only">
          Learning question
        </label>
        <textarea
          id="learning-question"
          rows={4}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          disabled={state.status === "loading" || authStatus === "loading"}
          placeholder="e.g. Explain how DNS works like I'm new to networking"
          className="w-full resize-y rounded-xl border border-border bg-card px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
        />
        <Button
          type="submit"
          className="w-full"
          disabled={
            state.status === "loading" ||
            authStatus === "loading" ||
            !question.trim()
          }
        >
          {state.status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating comic…
            </>
          ) : !authSession ? (
            "Sign in to generate"
          ) : (
            "Generate comic lesson"
          )}
        </Button>
      </form>

      {state.status === "loading" && (
        <p className="text-center text-sm text-muted-foreground" aria-live="polite">
          Planning, writing, validating, and drawing panels. Please keep this tab open.
        </p>
      )}

      {state.status === "error" && (
        <div
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          role="alert"
        >
          {state.message}
          {!authSession && (
            <div className="mt-3">
              <Button type="button" size="sm" onClick={() => signIn("google")}>
                Sign in with Google
              </Button>
            </div>
          )}
        </div>
      )}

      {state.status === "validation_failed" && (
        <div
          className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
          role="alert"
        >
          <p className="font-medium">{state.message}</p>
          {state.validation.feedback.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-amber-100/90">
              {state.validation.feedback.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {state.validation.improvements.length > 0 && (
            <div>
              <p className="mt-2 font-medium">Suggested improvements</p>
              <ul className="list-disc space-y-1 pl-5 text-amber-100/90">
                {state.validation.improvements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
