import { formatMessageTime } from "@/lib/chat-ui";

type AnswerCardProps = {
  content: string;
  lesson?: string | null;
  timestamp?: string | null;
  createdAt?: string;
};

export function AnswerCard({ content, lesson, timestamp, createdAt }: AnswerCardProps) {
  const mainContent = content.split(/\nSource:\n/)[0]?.trim() ?? content;
  const answeredAt = formatMessageTime(createdAt);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">{mainContent}</p>
      {(lesson || timestamp || answeredAt) && !content.includes("Source:") && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          {lesson && <p className="font-medium text-foreground/80">{lesson}</p>}
          {timestamp && <p className="font-mono">{timestamp}</p>}
          {answeredAt && <p>Answered {answeredAt}</p>}
        </div>
      )}
    </div>
  );
}
