import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AnswerCardProps = {
  answer: string;
};

export function AnswerCard({ answer }: AnswerCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Answer</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{answer}</p>
      </CardContent>
    </Card>
  );
}
