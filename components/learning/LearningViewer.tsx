"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ComicPanel } from "@/components/learning/ComicPanel";
import { LearningProgress } from "@/components/learning/LearningProgress";
import { Button } from "@/components/ui/button";
import type {
  ComicPlan,
  LearningPlan,
  RenderedComic,
  Story,
} from "@/lib/learning";

export type LearningViewerProps = {
  plan: LearningPlan;
  story: Story;
  comicPlan: ComicPlan;
  renderedComic: RenderedComic;
};

export function LearningViewer({
  plan,
  story,
  comicPlan,
  renderedComic,
}: LearningViewerProps) {
  const panels = useMemo(() => {
    const byId = new Map(renderedComic.panels.map((panel) => [panel.id, panel]));

    // Prefer comic plan order; fall back to rendered order.
    if (comicPlan.panels.length > 0) {
      return comicPlan.panels.map((planned) => {
        const rendered = byId.get(planned.id);
        return (
          rendered ?? {
            id: planned.id,
            imageUrl: "",
            narration: planned.narration,
            dialogue: planned.dialogue,
            learningPoint: planned.learningPoint,
          }
        );
      });
    }

    return [...renderedComic.panels].sort((a, b) => a.id - b.id);
  }, [comicPlan.panels, renderedComic.panels]);

  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(true);

  const total = panels.length;
  const current = panels[index];
  const title = story.title || comicPlan.title || renderedComic.title || plan.topic;

  if (!current || total === 0) {
    return (
      <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center gap-2 px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">{title || "Learning Viewer"}</h1>
        <p className="text-sm text-muted-foreground">No comic panels to display.</p>
      </div>
    );
  }

  function goTo(nextIndex: number) {
    setIndex(nextIndex);
    setExpanded(true);
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:py-8">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
        {plan.topic && plan.topic !== title && (
          <p className="text-sm text-muted-foreground">{plan.topic}</p>
        )}
        <LearningProgress current={index + 1} total={total} />
      </header>

      <ComicPanel
        panel={current}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />

      <nav className="flex items-center justify-between gap-3 pb-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => goTo(index + 1)}
          disabled={index >= total - 1}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}
