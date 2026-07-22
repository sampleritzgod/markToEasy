"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  Adaptation,
  AdaptationSession,
  ComicPlan,
  LearningPlan,
  Story,
} from "@/lib/learning/types";

const PRESETS = [
  "Make it simpler",
  "Make it more technical",
  "Use a real-world analogy",
  "Explain step-by-step",
] as const;

type LearningAdaptPanelProps = {
  plan: LearningPlan;
  story: Story;
  comicPlan: ComicPlan;
  onApply: (adaptation: Adaptation) => void;
};

export function LearningAdaptPanel({
  plan,
  story,
  comicPlan,
  onApply,
}: LearningAdaptPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adaptation, setAdaptation] = useState<Adaptation | null>(null);

  async function requestAdaptation(feedback: string) {
    setLoading(true);
    setError(null);

    try {
      const session: AdaptationSession = {
        learningPlan: plan,
        story,
        comicPlan,
      };

      const response = await fetch("/api/learning/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, session }),
      });

      const data = (await response.json()) as {
        adaptation?: Adaptation;
        error?: string;
      };

      if (!response.ok || !data.adaptation) {
        throw new Error(data.error ?? "Failed to adapt lesson");
      }

      setAdaptation(data.adaptation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className="space-y-4 border-t border-border pt-6"
      aria-labelledby="adapt-heading"
    >
      <div className="space-y-1">
        <h2 id="adapt-heading" className="text-lg font-semibold text-foreground">
          Adjust this lesson
        </h2>
        <p className="text-sm text-muted-foreground">
          Tell MarkToEasy how to reshape the explanation, then regenerate.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => void requestAdaptation(preset)}
          >
            {preset}
          </Button>
        ))}
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" />
          Planning adaptation…
        </p>
      )}

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {adaptation && (
        <div className="space-y-3 rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {adaptation.adaptationType}
          </p>
          <p className="text-sm text-foreground">{adaptation.updatedInstructions}</p>
          <p className="text-xs text-muted-foreground">
            Will regenerate: {adaptation.regenerate.join(", ")}
          </p>
          <Button type="button" onClick={() => onApply(adaptation)}>
            Regenerate with this adaptation
          </Button>
        </div>
      )}
    </section>
  );
}
