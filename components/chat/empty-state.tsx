"use client";

import { Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "Explain RAG",
  "How does Expo work?",
  "What is React Navigation?",
];

type EmptyStateProps = {
  onSelectPrompt: (prompt: string) => void;
  onLogin?: () => void;
  isLoggedIn: boolean;
};

export function EmptyState({ onSelectPrompt, onLogin, isLoggedIn }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
        Ask questions about your course
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        Search transcripts, get cited answers, and explore lessons with MarkToEasy.
      </p>

      {!isLoggedIn && onLogin && (
        <button
          type="button"
          onClick={onLogin}
          className="mt-6 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in to save chats
        </button>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
