import type { LoadingStep } from "@/components/chat/types";

const STEPS: { key: LoadingStep; label: string }[] = [
  { key: "searching", label: "Searching transcripts..." },
  { key: "ranking", label: "Ranking results..." },
  { key: "generating", label: "Generating answer..." },
];

type LoadingStateProps = {
  step: LoadingStep;
};

export function LoadingState({ step }: LoadingStateProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-3 rounded-xl border border-border bg-card p-5">
        {STEPS.map((item, index) => {
          const isActive = index === currentIndex;
          const isDone = index < currentIndex;

          return (
            <div key={item.key} className="flex items-center gap-3">
              <div
                className={`h-2 w-2 rounded-full ${
                  isDone ? "bg-primary" : isActive ? "bg-primary" : "bg-muted"
                }`}
              />
              <p
                className={`text-sm ${
                  isActive ? "font-medium text-foreground" : isDone ? "text-muted-foreground" : "text-muted-foreground/50"
                }`}
              >
                {item.label}
              </p>
            </div>
          );
        })}
        <div className="mt-2 space-y-2">
          <div className="h-3 w-full rounded bg-muted/80" />
          <div className="h-3 w-5/6 rounded bg-muted/60" />
          <div className="h-3 w-4/6 rounded bg-muted/40" />
        </div>
      </div>
    </div>
  );
}

export function getLoadingLabel(step: LoadingStep): string {
  return STEPS.find((s) => s.key === step)?.label ?? "Working...";
}
