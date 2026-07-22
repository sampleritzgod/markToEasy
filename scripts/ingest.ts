import { chunkSubtitles } from "@/lib/chunker";
import { embed } from "@/lib/embeddings";
import { ingestSubtitles } from "@/lib/parser";
import { createCollection, insertChunk } from "@/lib/vector";

function log(step: string, message: string) {
  console.log(`[${step}] ${message}`);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function validateEnv() {
  const missing: string[] = [];

  if (!process.env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
  if (!process.env.QDRANT_URL) missing.push("QDRANT_URL");

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
}

async function main() {
  validateEnv();

  log("1/5", "Reading subtitle files...");
  const entries = await ingestSubtitles();

  if (entries.length === 0) {
    log("done", "No subtitle files found in data/subtitles.");
    return;
  }

  const lessonCount = new Set(entries.map((e) => e.lessonName)).size;
  log("1/5", `Found ${entries.length} entries across ${lessonCount} lessons.`);

  log("2/5", "Parsing complete.");

  log("3/5", "Chunking entries...");
  const chunks = chunkSubtitles(entries);
  log("3/5", `Created ${chunks.length} chunks.`);

  log("4/5", "Preparing Qdrant collection...");
  await createCollection();
  log("4/5", "Collection ready.");

  log("5/5", "Generating embeddings and storing chunks...");
  let stored = 0;
  let failed = 0;
  const failures: { id: string; lesson: string; error: string }[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const progress = `[${i + 1}/${chunks.length}]`;

    try {
      const embedding = await embed(chunk.text);

      await insertChunk({
        id: chunk.id,
        embedding,
        lesson: chunk.lesson,
        startTimestamp: chunk.startTimestamp,
        endTimestamp: chunk.endTimestamp,
        text: chunk.text,
      });

      stored++;
      console.log(`${progress} stored — ${chunk.lesson}`);
    } catch (error) {
      failed++;
      const message = formatError(error);
      failures.push({ id: chunk.id, lesson: chunk.lesson, error: message });
      console.error(`${progress} failed — ${chunk.lesson}: ${message}`);
    }
  }

  console.log("");
  log("done", `Stored ${stored}/${chunks.length} chunks.`);

  if (failed > 0) {
    log("done", `${failed} chunk(s) failed.`);
    for (const failure of failures) {
      console.error(`  - ${failure.id} (${failure.lesson}): ${failure.error}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[error] ${formatError(error)}`);
  process.exit(1);
});
