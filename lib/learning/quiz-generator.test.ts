import { describe, expect, it } from "vitest";

import { parseQuiz } from "./quiz-generator";

function makeQuestion(id: string, correct = "A") {
  return {
    id,
    question: `Question ${id}?`,
    options: ["A", "B", "C", "D"],
    correctAnswer: correct,
    explanation: "Because A is right.",
  };
}

describe("parseQuiz", () => {
  const valid = {
    questions: [
      makeQuestion("q1"),
      makeQuestion("q2"),
      makeQuestion("q3"),
      makeQuestion("q4"),
      makeQuestion("q5"),
    ],
  };

  it("parses a valid 5-question quiz", () => {
    expect(parseQuiz(valid).questions).toHaveLength(5);
  });

  it("rejects wrong question count", () => {
    expect(() =>
      parseQuiz({ questions: [makeQuestion("q1")] }),
    ).toThrow(/expected 5/);
  });

  it("rejects correctAnswer not in options", () => {
    const questions = valid.questions.map((q) => ({ ...q }));
    questions[0] = { ...questions[0], correctAnswer: "E" };
    expect(() => parseQuiz({ questions })).toThrow(/must match one of the options/);
  });

  it("rejects duplicate ids", () => {
    const questions = valid.questions.map((q) => ({ ...q, id: "q1" }));
    expect(() => parseQuiz({ questions })).toThrow(/duplicate question id/);
  });

  it("rejects fewer than 4 options", () => {
    const questions = valid.questions.map((q, i) =>
      i === 0 ? { ...q, options: ["A", "B"] } : q,
    );
    expect(() => parseQuiz({ questions })).toThrow(/exactly 4 options/);
  });

  it("rejects non-object", () => {
    expect(() => parseQuiz(null)).toThrow(/JSON object/);
  });
});
