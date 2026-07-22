"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import type { Source } from "@/components/chat/types";
import { formatCitation, parseChunkNumber } from "@/lib/chat-ui";

type SourceCardProps = {
  source: Source;
  rank: number;
  total: number;
};

export function SourceCard({ source, rank, total }: SourceCardProps) {
  const [copied, setCopied] = useState(false);
  const citation = formatCitation(source);
  const chunkNumber = parseChunkNumber(source.chunkId);

  async function copyCitation() {
    await navigator.clipboard.writeText(`${citation}\n\n${source.text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4 transition-colors hover:border-border/80 hover:bg-card">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
              Source {rank} of {total}
            </span>
            {chunkNumber !== null && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Chunk #{chunkNumber}
              </span>
            )}
            {source.score > 0 && (
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {(source.score * 100).toFixed(0)}% match
              </span>
            )}
          </div>
          <p className="truncate text-sm font-medium text-foreground">{source.lesson}</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {source.startTimestamp} → {source.endTimestamp}
          </p>
        </div>
      </div>
      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{source.text}</p>
      <button
        type="button"
        onClick={copyCitation}
        className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy citation"}
      </button>
    </div>
  );
}
