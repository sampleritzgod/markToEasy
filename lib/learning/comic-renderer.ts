import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import {
  createImageProvider,
  type ImageProvider,
} from "@/lib/providers/image-provider";

import type {
  ComicPlan,
  ImagePromptPlan,
  RenderedComic,
  RenderedPanel,
} from "./types";

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_STORAGE_DIR = "public/generated/comics";

export type PanelContent = {
  narration?: string;
  dialogue?: string;
  learningPoint?: string;
};

export type ImageStorageSaveInput = {
  bytes: Buffer;
  mimeType: string;
  panelId: number;
  comicId: string;
};

export type ImageStorageSaveResult = {
  url: string;
};

export interface ImageStorage {
  save(input: ImageStorageSaveInput): Promise<ImageStorageSaveResult>;
}

export type RenderComicOptions = {
  title?: string;
  comicPlan?: ComicPlan;
  panelContent?: Record<number, PanelContent>;
  provider?: ImageProvider;
  storage?: ImageStorage;
  storageDir?: string;
  concurrency?: number;
  maxRetries?: number;
};

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/png":
    default:
      return "png";
  }
}

export class LocalImageStorage implements ImageStorage {
  constructor(private readonly storageDir: string = DEFAULT_STORAGE_DIR) {}

  async save(input: ImageStorageSaveInput): Promise<ImageStorageSaveResult> {
    const ext = extensionForMime(input.mimeType);
    const relativeDir = path.join(this.storageDir, input.comicId);
    const absoluteDir = path.resolve(process.cwd(), relativeDir);
    await mkdir(absoluteDir, { recursive: true });

    const filename = `panel-${input.panelId}.${ext}`;
    const absolutePath = path.join(absoluteDir, filename);
    await writeFile(absolutePath, input.bytes);

    const publicRoot = "public";
    const normalizedDir = relativeDir.replace(/\\/g, "/");
    const urlPath = normalizedDir.startsWith(`${publicRoot}/`)
      ? normalizedDir.slice(publicRoot.length)
      : `/${normalizedDir}`;

    return {
      url: `${urlPath}/${filename}`.replace(/\/{2,}/g, "/"),
    };
  }
}

/** Inlines images as data URLs — required on Vercel (read-only FS except /tmp). */
export class DataUrlImageStorage implements ImageStorage {
  async save(input: ImageStorageSaveInput): Promise<ImageStorageSaveResult> {
    return {
      url: `data:${input.mimeType};base64,${input.bytes.toString("base64")}`,
    };
  }
}

export function createDefaultImageStorage(
  storageDir: string = DEFAULT_STORAGE_DIR,
): ImageStorage {
  if (process.env.VERCEL || process.env.USE_DATA_URL_IMAGES === "1") {
    return new DataUrlImageStorage();
  }
  return new LocalImageStorage(storageDir);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await sleep(250 * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? "Unknown error"));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, concurrency);
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const current = nextIndex++;
      if (current >= items.length) {
        return;
      }
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  );
  await Promise.all(workers);
  return results;
}

function resolvePanelContent(
  panelId: number,
  options: RenderComicOptions,
): Required<PanelContent> {
  const fromComic = options.comicPlan?.panels.find((panel) => panel.id === panelId);
  const fromMap = options.panelContent?.[panelId];

  return {
    narration: fromMap?.narration ?? fromComic?.narration ?? "",
    dialogue: fromMap?.dialogue ?? fromComic?.dialogue ?? "",
    learningPoint: fromMap?.learningPoint ?? fromComic?.learningPoint ?? "",
  };
}

function assertValidImagePromptPlan(plan: ImagePromptPlan): void {
  if (!plan?.style?.trim()) {
    throw new Error("Image prompt plan style is required");
  }
  if (!Array.isArray(plan.panels) || plan.panels.length === 0) {
    throw new Error("Image prompt plan panels are required");
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function renderComic(
  imagePromptPlan: ImagePromptPlan,
  options: RenderComicOptions = {},
): Promise<RenderedComic> {
  assertValidImagePromptPlan(imagePromptPlan);

  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const provider = options.provider ?? createImageProvider("openai");
  const storage =
    options.storage ??
    createDefaultImageStorage(options.storageDir ?? DEFAULT_STORAGE_DIR);
  const comicId = randomUUID();
  const title = options.title ?? options.comicPlan?.title ?? "Untitled Comic";

  const rendered = await mapWithConcurrency(
    imagePromptPlan.panels,
    concurrency,
    async (panel): Promise<RenderedPanel> => {
      const content = resolvePanelContent(panel.id, options);

      try {
        const image = await withRetry(
          () =>
            provider.generateImage({
              prompt: panel.imagePrompt,
              panelId: panel.id,
              style: imagePromptPlan.style,
            }),
          maxRetries,
        );

        const saved = await storage.save({
          bytes: image.bytes,
          mimeType: image.mimeType,
          panelId: panel.id,
          comicId,
        });

        return {
          id: panel.id,
          imageUrl: saved.url,
          narration: content.narration,
          dialogue: content.dialogue,
          learningPoint: content.learningPoint,
        };
      } catch (error) {
        return {
          id: panel.id,
          imageUrl: "",
          narration: content.narration,
          dialogue: content.dialogue,
          learningPoint: content.learningPoint,
          error: toErrorMessage(error),
        };
      }
    },
  );

  // Preserve original panel order explicitly (workers write by index already).
  const panels = [...rendered].sort((a, b) => {
    const aIndex = imagePromptPlan.panels.findIndex((panel) => panel.id === a.id);
    const bIndex = imagePromptPlan.panels.findIndex((panel) => panel.id === b.id);
    return aIndex - bIndex;
  });

  return {
    title,
    style: imagePromptPlan.style,
    panels,
  };
}
