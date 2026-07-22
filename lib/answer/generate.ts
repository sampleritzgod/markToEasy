import OpenAI from "openai";

import type { SemanticSearchResult } from "@/lib/search";

import type { GenerateAnswerInput } from "./types";

const MODEL = "gpt-4o-mini";
const NOT_FOUND = "The information was not found in the course transcripts.";

function formatChunks(chunks: SemanticSearchResult[]): string {
  return chunks
    .map(
      (chunk, index) =>
        `[${index + 1}]
Lesson: ${chunk.lesson}
Timestamp: ${chunk.startTimestamp} --> ${chunk.endTimestamp}
Text: ${chunk.text}`,
    )
    .join("\n\n");
}

export async function generateAnswer(input: GenerateAnswerInput): Promise<string> {
  const { question, chunks } = input;

  if (chunks.length === 0) {
    return NOT_FOUND;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `Answer using only the transcript chunks provided.
- Do not use outside knowledge.
- Do not guess or invent details.
- If the chunks do not contain the answer, reply exactly: "${NOT_FOUND}"
- If you can answer, keep it concise.
- End every answer with:

Source:
- Lesson: <lesson name>
  Timestamp: <start> --> <end>`,
      },
      {
        role: "user",
        content: `Question: ${question}

Transcript chunks:
${formatChunks(chunks)}`,
      },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? NOT_FOUND;
}
