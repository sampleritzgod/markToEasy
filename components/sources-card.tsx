import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type Source = {
  lesson: string;
  startTimestamp: string;
  endTimestamp: string;
  text: string;
};

type SourcesCardProps = {
  sources: Source[];
};

export function SourcesCard({ sources }: SourcesCardProps) {
  if (sources.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sources.map((source, index) => (
          <div
            key={`${source.lesson}-${source.startTimestamp}-${index}`}
            className="border-t pt-4 first:border-t-0 first:pt-0"
          >
            <p className="text-sm font-medium">{source.lesson}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {source.startTimestamp} → {source.endTimestamp}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{source.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
