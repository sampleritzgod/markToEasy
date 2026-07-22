"use client";

import { AnswerCard } from "@/components/chat/answer-card";
import { SourceCard } from "@/components/chat/source-card";
import type { Source } from "@/components/chat/types";

type MessageBubbleProps = {
  role: string;
  content: string;
  sources?: Source[] | null;
  lesson?: string | null;
  timestamp?: string | null;
  createdAt?: string;
};

export function MessageBubble({
  role,
  content,
  sources,
  lesson,
  timestamp,
  createdAt,
}: MessageBubbleProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-3">
        <div className="max-w-[85%] rounded-xl bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground md:max-w-[70%]">
          {content}
        </div>
      </div>
    );
  }

  const sourceList = sources ?? [];

  return (
    <div className="px-4 py-3">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <AnswerCard content={content} lesson={lesson} timestamp={timestamp} createdAt={createdAt} />
        {sourceList.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sources ({sourceList.length})
            </p>
            <div className="grid gap-2">
              {sourceList.map((source, index) => (
                <SourceCard
                  key={`${source.lesson}-${source.startTimestamp}-${index}`}
                  source={source}
                  rank={index + 1}
                  total={sourceList.length}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
