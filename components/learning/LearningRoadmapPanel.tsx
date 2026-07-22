"use client";

import type { LearningRoadmap } from "@/lib/learning/types";

type LearningRoadmapPanelProps = {
  roadmap: LearningRoadmap;
  onSelectTopic?: (title: string) => void;
};

export function LearningRoadmapPanel({
  roadmap,
  onSelectTopic,
}: LearningRoadmapPanelProps) {
  return (
    <section
      className="space-y-4 border-t border-border pt-6"
      aria-labelledby="roadmap-heading"
    >
      <div className="space-y-1">
        <h2 id="roadmap-heading" className="text-lg font-semibold text-foreground">
          What to learn next
        </h2>
        <p className="text-sm text-muted-foreground">
          After {roadmap.currentTopic}. Estimated time: {roadmap.estimatedLearningTime}.
        </p>
      </div>

      {roadmap.completedConcepts.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Covered
          </p>
          <p className="mt-1 text-sm text-foreground">
            {roadmap.completedConcepts.join(" · ")}
          </p>
        </div>
      )}

      <ol className="space-y-3">
        {roadmap.nextTopics.map((topic, index) => (
          <li
            key={`${topic.title}-${index}`}
            className="rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {index + 1}. {topic.title}
                </p>
                <p className="text-sm text-muted-foreground">{topic.reason}</p>
              </div>
              <span className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                {topic.difficulty}
              </span>
            </div>
            {onSelectTopic && (
              <button
                type="button"
                className="mt-3 text-sm font-medium text-primary hover:underline"
                onClick={() => onSelectTopic(topic.title)}
              >
                Learn this next
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
