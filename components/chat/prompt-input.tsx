"use client";

import { Send } from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useRef } from "react";

type PromptInputProps = {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function PromptInput({ value, loading, onChange, onSubmit }: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!loading && value.trim()) onSubmit();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!loading && value.trim()) onSubmit();
  }

  return (
    <div className="sticky bottom-0 border-t border-border bg-background px-4 py-4">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-3xl items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-sm"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Ask anything about your course..."
          className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
      <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
