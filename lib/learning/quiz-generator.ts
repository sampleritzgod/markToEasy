import type { Quiz, QuizLesson, QuizQuestion } from "./types";
import {
  asNonEmptyString,
  getOpenAIClient,
  parseModelJson,
  requireModelContent,
} from "./shared";

const MODEL = "gpt-4o-mini";
const QUESTION_COUNT = 5;
const OPTION_COUNT = 4;

const SYSTEM_PROMPT = `Generate a quiz from a completed lesson. Return ONLY valid JSON.

Rules:
- Generate exactly ${QUESTION_COUNT} multiple-choice questions.
- Test understanding and application, not rote memorization of wording.
- Each question must have exactly ${OPTION_COUNT} options.
- correctAnswer must exactly match one of the options.
- explanation must briefly say why the correct answer is right.
- Cover different parts of the lesson (plan concepts, story ideas, comic learning points).
- Use stable string ids like "q1", "q2", ...
- Return valid JSON only:
{
  "questions": [
    {
      "id": string,
      "question": string,
      "options": string[],
      "correctAnswer": string,
      "explanation": string
    }
  ]
}`;

function parseQuestion(raw: unknown, index: number): QuizQuestion {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid quiz: questions[${index}] must be an object`);
  }

  const data = raw as Record<string, unknown>;
  const options = Array.isArray(data.options)
    ? data.options
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  if (options.length !== OPTION_COUNT) {
    throw new Error(
      `Invalid quiz: questions[${index}] must have exactly ${OPTION_COUNT} options`,
    );
  }

  const correctAnswer = asNonEmptyString(
    data.correctAnswer,
    `questions[${index}].correctAnswer`,
    "quiz",
  );

  if (!options.includes(correctAnswer)) {
    throw new Error(
      `Invalid quiz: questions[${index}].correctAnswer must match one of the options`,
    );
  }

  return {
    id: asNonEmptyString(data.id, `questions[${index}].id`, "quiz"),
    question: asNonEmptyString(data.question, `questions[${index}].question`, "quiz"),
    options,
    correctAnswer,
    explanation: asNonEmptyString(
      data.explanation,
      `questions[${index}].explanation`,
      "quiz",
    ),
  };
}

export function parseQuiz(raw: unknown): Quiz {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid quiz: expected a JSON object");
  }

  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.questions)) {
    throw new Error('Invalid quiz: "questions" must be an array');
  }

  if (data.questions.length !== QUESTION_COUNT) {
    throw new Error(
      `Invalid quiz: expected ${QUESTION_COUNT} questions (got ${data.questions.length})`,
    );
  }

  const questions = data.questions.map((question, index) =>
    parseQuestion(question, index),
  );

  const ids = new Set<string>();
  for (const question of questions) {
    if (ids.has(question.id)) {
      throw new Error(`Invalid quiz: duplicate question id "${question.id}"`);
    }
    ids.add(question.id);
  }

  return { questions };
}

function assertValidLesson(lesson: QuizLesson): void {
  if (!lesson?.plan?.topic?.trim()) {
    throw new Error("Lesson plan topic is required");
  }
  if (!lesson.story?.story?.trim()) {
    throw new Error("Lesson story is required");
  }
  if (!Array.isArray(lesson.comicPlan?.panels) || lesson.comicPlan.panels.length === 0) {
    throw new Error("Lesson comic plan panels are required");
  }
}

export async function generateQuiz(lesson: QuizLesson): Promise<Quiz> {
  assertValidLesson(lesson);

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Create a quiz for this completed lesson.

Learning plan:
${JSON.stringify(lesson.plan, null, 2)}

Story:
${JSON.stringify(lesson.story, null, 2)}

Comic plan:
${JSON.stringify(lesson.comicPlan, null, 2)}`,
      },
    ],
  });

  const content = requireModelContent(
    response.choices[0]?.message?.content,
    "quiz",
  );
  return parseQuiz(parseModelJson(content, "quiz"));
}
