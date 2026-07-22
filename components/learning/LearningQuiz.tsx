"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { Quiz, QuizQuestion } from "@/lib/learning";
import { cn } from "@/lib/utils";

type LearningQuizProps = {
  quiz: Quiz;
};

type AnswerState = {
  selected: string | null;
  revealed: boolean;
};

export function LearningQuiz({ quiz }: LearningQuizProps) {
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    if (!submitted) return null;
    let correct = 0;
    for (const question of quiz.questions) {
      if (answers[question.id]?.selected === question.correctAnswer) {
        correct += 1;
      }
    }
    return { correct, total: quiz.questions.length };
  }, [answers, quiz.questions, submitted]);

  function selectOption(question: QuizQuestion, option: string) {
    if (submitted) return;
    setAnswers((current) => ({
      ...current,
      [question.id]: { selected: option, revealed: false },
    }));
  }

  function handleSubmit() {
    const next: Record<string, AnswerState> = {};
    for (const question of quiz.questions) {
      next[question.id] = {
        selected: answers[question.id]?.selected ?? null,
        revealed: true,
      };
    }
    setAnswers(next);
    setSubmitted(true);
  }

  function handleRetry() {
    setAnswers({});
    setSubmitted(false);
  }

  const allAnswered = quiz.questions.every((question) =>
    Boolean(answers[question.id]?.selected),
  );

  if (quiz.questions.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4 border-t border-border pt-6" aria-labelledby="quiz-heading">
      <div className="space-y-1">
        <h2 id="quiz-heading" className="text-lg font-semibold text-foreground">
          Check your understanding
        </h2>
        <p className="text-sm text-muted-foreground">
          {quiz.questions.length} multiple-choice questions from this lesson.
        </p>
      </div>

      <ol className="space-y-5">
        {quiz.questions.map((question, index) => {
          const state = answers[question.id];
          const selected = state?.selected ?? null;
          const revealed = Boolean(state?.revealed);

          return (
            <li key={question.id} className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                {index + 1}. {question.question}
              </p>
              <div className="grid gap-2" role="group" aria-label={`Options for question ${index + 1}`}>
                {question.options.map((option) => {
                  const isSelected = selected === option;
                  const isCorrect = option === question.correctAnswer;
                  const showCorrect = revealed && isCorrect;
                  const showWrong = revealed && isSelected && !isCorrect;

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={submitted}
                      onClick={() => selectOption(question, option)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        showCorrect && "border-emerald-500/50 bg-emerald-500/10 text-foreground",
                        showWrong && "border-red-500/40 bg-red-500/10 text-foreground",
                        !showCorrect &&
                          !showWrong &&
                          isSelected &&
                          "border-primary bg-primary/10 text-foreground",
                        !showCorrect &&
                          !showWrong &&
                          !isSelected &&
                          "border-border bg-card text-foreground hover:bg-muted",
                        submitted && "disabled:opacity-100",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {revealed && (
                <p className="text-sm text-muted-foreground">{question.explanation}</p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        {!submitted ? (
          <Button type="button" onClick={handleSubmit} disabled={!allAnswered}>
            Check answers
          </Button>
        ) : (
          <>
            {score && (
              <p className="text-sm font-medium text-foreground" aria-live="polite">
                Score: {score.correct}/{score.total}
              </p>
            )}
            <Button type="button" variant="outline" onClick={handleRetry}>
              Try again
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
