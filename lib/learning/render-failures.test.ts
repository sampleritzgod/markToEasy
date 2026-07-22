import { describe, expect, it } from "vitest";

import {
  ComicRenderIncompleteError,
  summarizeRenderFailures,
} from "./render-failures";
import type { RenderedComic } from "./types";

function panel(
  id: number,
  opts: { imageUrl?: string; error?: string } = {},
) {
  return {
    id,
    imageUrl: opts.imageUrl ?? "",
    narration: "n",
    dialogue: "",
    learningPoint: "lp",
    error: opts.error,
  };
}

describe("summarizeRenderFailures", () => {
  it("reports no failures when all panels have images", () => {
    const comic: RenderedComic = {
      title: "T",
      style: "educational comic",
      panels: [panel(1, { imageUrl: "/a.png" }), panel(2, { imageUrl: "/b.png" })],
    };

    const summary = summarizeRenderFailures(comic);
    expect(summary.someFailed).toBe(false);
    expect(summary.allFailed).toBe(false);
    expect(summary.failedCount).toBe(0);
  });

  it("detects partial failures", () => {
    const comic: RenderedComic = {
      title: "T",
      style: "educational comic",
      panels: [
        panel(1, { imageUrl: "/a.png" }),
        panel(2, { error: "boom" }),
      ],
    };

    const summary = summarizeRenderFailures(comic);
    expect(summary.someFailed).toBe(true);
    expect(summary.allFailed).toBe(false);
    expect(summary.failedPanels.map((p) => p.id)).toEqual([2]);
  });

  it("detects total failure", () => {
    const comic: RenderedComic = {
      title: "T",
      style: "educational comic",
      panels: [panel(1, { error: "a" }), panel(2, { error: "b" })],
    };

    const summary = summarizeRenderFailures(comic);
    expect(summary.allFailed).toBe(true);
    expect(() => {
      throw new ComicRenderIncompleteError(comic, summary);
    }).toThrow(/All 2 comic panel/);
  });
});
