"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { ComicPanel } from "@/components/learning/ComicPanel";
import { LearningAdaptPanel } from "@/components/learning/LearningAdaptPanel";
import { LearningProgress } from "@/components/learning/LearningProgress";
import { LearningQuiz } from "@/components/learning/LearningQuiz";
import { LearningRoadmapPanel } from "@/components/learning/LearningRoadmapPanel";
import { Button } from "@/components/ui/button";
import type {
  Adaptation,
  ComicPlan,
  LearningPlan,
  LearningRoadmap,
  Quiz,
  RenderedComic,
  Story,
} from "@/lib/learning/types";
import { summarizeRenderFailures } from "@/lib/learning/render-failures";

export type LearningViewerProps = {
  plan: LearningPlan;
  story: Story;
  comicPlan: ComicPlan;
  renderedComic: RenderedComic;
  quiz?: Quiz | null;
  roadmap?: LearningRoadmap | null;
  onSelectNextTopic?: (title: string) => void;
  onApplyAdaptation?: (adaptation: Adaptation) => void;
};

export function LearningViewer({
  plan,
  story,
  comicPlan,
  renderedComic,
  quiz,
  roadmap,
  onSelectNextTopic,
  onApplyAdaptation,
}: LearningViewerProps) {
  const panels = useMemo(() => {
    const byId = new Map(renderedComic.panels.map((panel) => [panel.id, panel]));

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

  const renderSummary = useMemo(
    () => summarizeRenderFailures({ ...renderedComic, panels }),
    [panels, renderedComic],
  );

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

      {renderSummary.someFailed && (
        <div
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          <p className="font-medium">
            {renderSummary.failedCount} of {renderSummary.totalCount} panel image
            {renderSummary.failedCount === 1 ? "" : "s"} failed to generate.
          </p>
          <p className="mt-1 text-amber-100/80">
            Failed panels:{" "}
            {renderSummary.failedPanels.map((panel) => panel.id).join(", ")}. You can
            still read narration and learning points.
          </p>
        </div>
      )}

      <ComicPanel
        panel={current}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      />

      <nav className="flex items-center justify-between gap-3">
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

      {quiz && quiz.questions.length > 0 && <LearningQuiz quiz={quiz} />}

      {roadmap && (
        <LearningRoadmapPanel roadmap={roadmap} onSelectTopic={onSelectNextTopic} />
      )}

      {onApplyAdaptation && (
        <LearningAdaptPanel
          plan={plan}
          story={story}
          comicPlan={comicPlan}
          onApply={onApplyAdaptation}
        />
      )}
    </div>
  );
}
