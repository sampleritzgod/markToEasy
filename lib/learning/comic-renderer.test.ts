import { describe, expect, it } from "vitest";

import { renderComic, type ImageStorage } from "./comic-renderer";
import type { ImageProvider } from "@/lib/providers/image-provider";
import type { ImagePromptPlan } from "./types";

const plan: ImagePromptPlan = {
  style: "educational comic",
  panels: [
    { id: 1, imagePrompt: "panel one prompt" },
    { id: 2, imagePrompt: "panel two prompt" },
  ],
};

function mockProvider(failIds: number[] = []): ImageProvider {
  return {
    id: "mock",
    async generateImage(input) {
      if (failIds.includes(input.panelId)) {
        throw new Error(`fail-${input.panelId}`);
      }
      return {
        bytes: Buffer.from(`img-${input.panelId}`),
        mimeType: "image/png",
      };
    },
  };
}

function mockStorage(): ImageStorage {
  return {
    async save(input) {
      return { url: `/generated/comics/${input.comicId}/panel-${input.panelId}.png` };
    },
  };
}

describe("renderComic", () => {
  it("renders all panels successfully", async () => {
    const comic = await renderComic(plan, {
      title: "Test Comic",
      provider: mockProvider(),
      storage: mockStorage(),
      maxRetries: 1,
    });

    expect(comic.title).toBe("Test Comic");
    expect(comic.panels).toHaveLength(2);
    expect(comic.panels.every((p) => p.imageUrl && !p.error)).toBe(true);
  });

  it("captures per-panel errors without failing the whole comic", async () => {
    const comic = await renderComic(plan, {
      provider: mockProvider([2]),
      storage: mockStorage(),
      maxRetries: 1,
    });

    expect(comic.panels[0].error).toBeUndefined();
    expect(comic.panels[1].imageUrl).toBe("");
    expect(comic.panels[1].error).toContain("fail-2");
  });

  it("retries failed generations", async () => {
    let attempts = 0;
    const provider: ImageProvider = {
      id: "flaky",
      async generateImage() {
        attempts += 1;
        if (attempts < 3) throw new Error("transient");
        return { bytes: Buffer.from("ok"), mimeType: "image/png" };
      },
    };

    const comic = await renderComic(
      { style: "educational comic", panels: [{ id: 1, imagePrompt: "p" }] },
      { provider, storage: mockStorage(), maxRetries: 3 },
    );

    expect(attempts).toBe(3);
    expect(comic.panels[0].error).toBeUndefined();
  });

  it("rejects empty panel list", async () => {
    await expect(
      renderComic(
        { style: "educational comic", panels: [] },
        { provider: mockProvider(), storage: mockStorage() },
      ),
    ).rejects.toThrow(/panels are required/);
  });

  it("merges panel content from comicPlan", async () => {
    const comic = await renderComic(plan, {
      provider: mockProvider(),
      storage: mockStorage(),
      comicPlan: {
        title: "From Plan",
        panels: [
          {
            id: 1,
            scene: "s",
            narration: "n1",
            dialogue: "d1",
            visualDescription: "v",
            learningPoint: "lp1",
          },
          {
            id: 2,
            scene: "s",
            narration: "n2",
            dialogue: "d2",
            visualDescription: "v",
            learningPoint: "lp2",
          },
        ],
      },
    });

    expect(comic.panels[0].narration).toBe("n1");
    expect(comic.panels[1].learningPoint).toBe("lp2");
  });
});
