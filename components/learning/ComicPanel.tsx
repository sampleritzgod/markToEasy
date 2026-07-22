"use client";

import { ChevronDown, ChevronUp, ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RenderedPanel } from "@/lib/learning";
import { cn } from "@/lib/utils";

type ComicPanelProps = {
  panel: RenderedPanel;
  expanded: boolean;
  onToggle: () => void;
};

export function ComicPanel({ panel, expanded, onToggle }: ComicPanelProps) {
  const hasImage = Boolean(panel.imageUrl);
  const hasDialogue = Boolean(panel.dialogue?.trim());
  const hasNarration = Boolean(panel.narration?.trim());
  const hasLearningPoint = Boolean(panel.learningPoint?.trim());

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative aspect-[4/3] w-full bg-muted">
        {hasImage ? (
          // Dynamic comic URLs may be local paths or remote provider URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={panel.imageUrl}
            alt={`Panel ${panel.id}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="h-8 w-8" />
            <p className="text-sm">{panel.error ? "Image unavailable" : "No image"}</p>
          </div>
        )}
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Panel {panel.id}</p>
            {hasLearningPoint && !expanded && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {panel.learningPoint}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggle}
            aria-expanded={expanded}
            className="shrink-0"
          >
            {expanded ? "Hide details" : "Show details"}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200",
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-3 pb-1">
              {hasNarration && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Narration
                  </p>
                  <p className="mt-1 text-sm leading-6 text-foreground">{panel.narration}</p>
                </div>
              )}

              {hasDialogue && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Dialogue
                  </p>
                  <p className="mt-1 text-sm leading-6 text-foreground italic">
                    “{panel.dialogue}”
                  </p>
                </div>
              )}

              {hasLearningPoint && (
                <div className="rounded-lg bg-muted px-3 py-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Learning point
                  </p>
                  <p className="mt-1 text-sm leading-6 text-foreground">{panel.learningPoint}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
