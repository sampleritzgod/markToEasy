type LearningProgressProps = {
  current: number;
  total: number;
};

export function LearningProgress({ current, total }: LearningProgressProps) {
  const safeTotal = Math.max(total, 1);
  const safeCurrent = Math.min(Math.max(current, 1), safeTotal);
  const percent = Math.round((safeCurrent / safeTotal) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {safeCurrent}/{safeTotal}
        </span>
        <span>{percent}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={safeTotal}
        aria-valuenow={safeCurrent}
        aria-label={`Panel ${safeCurrent} of ${safeTotal}`}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
