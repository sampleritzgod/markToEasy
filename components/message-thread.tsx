import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ThreadMessage = {
  id: string;
  role: string;
  content: string;
  lesson?: string | null;
  timestamp?: string | null;
};

type MessageThreadProps = {
  messages: ThreadMessage[];
};

export function MessageThread({ messages }: MessageThreadProps) {
  if (messages.length === 0) return null;

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <Card key={message.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base capitalize">{message.role}</CardTitle>
            {message.role === "assistant" && message.lesson && (
              <p className="text-xs text-muted-foreground">
                {message.lesson}
                {message.timestamp ? ` · ${message.timestamp}` : ""}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
