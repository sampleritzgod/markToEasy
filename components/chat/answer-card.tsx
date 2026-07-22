type AnswerCardProps = {
  content: string;
  lesson?: string | null;
  timestamp?: string | null;
};

export function AnswerCard({ content, lesson, timestamp }: AnswerCardProps) {
  const mainContent = content.split(/\nSource:\n/)[0]?.trim() ?? content;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">{mainContent}</p>
      {(lesson || timestamp) && !content.includes("Source:") && (
        <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          {lesson && <p className="font-medium text-foreground/80">{lesson}</p>}
          {timestamp && <p>{timestamp}</p>}
        </div>
      )}
    </div>
  );
}
