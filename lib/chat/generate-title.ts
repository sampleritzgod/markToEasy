import OpenAI from "openai";

const MODEL = "gpt-4o-mini";

function fallbackTitle(message: string): string {
  const trimmed = message.trim();
  return trimmed.length > 40 ? trimmed.slice(0, 40) : trimmed;
}

function sanitizeTitle(raw: string): string {
  return raw
    .trim()
    .replace(/^(title\s*:\s*)/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
}

function hasEmoji(text: string): boolean {
  return /\p{Extended_Pictographic}/u.test(text);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isValidTitle(title: string): boolean {
  if (!title || hasEmoji(title)) {
    return false;
  }

  const words = wordCount(title);
  return words >= 3 && words <= 6;
}

export async function generateChatTitle(message: string): Promise<string> {
  const fallback = fallbackTitle(message);

  if (!message.trim()) {
    return fallback;
  }

  try {
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
          content: `Generate a concise chat title from the user's first message.

Rules:
- 3 to 6 words only
- Clear and descriptive
- Use Title Case
- No quotation marks
- No emojis
- No punctuation unless absolutely necessary
- Return only the title string
- Do not include prefixes like "Title:" or explanations

Examples:

User: "How does vector embedding work?"
Title: Vector Embeddings

User: "Explain React Native navigation."
Title: React Native Navigation

User: "What is RAG Fusion?"
Title: Understanding RAG Fusion

User: "How do embeddings improve semantic search in RAG?"
Title: Embeddings in RAG`,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const title = sanitizeTitle(response.choices[0]?.message?.content ?? "");
    if (!isValidTitle(title)) {
      throw new Error("Invalid title returned");
    }

    return title;
  } catch (error) {
    console.error("Chat title generation failed:", error);
    return fallback;
  }
}
