import type { RenderedComic, RenderedPanel } from "./types";

export type RenderFailureSummary = {
  failedPanels: RenderedPanel[];
  failedCount: number;
  totalCount: number;
  allFailed: boolean;
  someFailed: boolean;
};

export function summarizeRenderFailures(comic: RenderedComic): RenderFailureSummary {
  const failedPanels = comic.panels.filter((panel) => Boolean(panel.error) || !panel.imageUrl);
  const failedCount = failedPanels.length;
  const totalCount = comic.panels.length;

  return {
    failedPanels,
    failedCount,
    totalCount,
    allFailed: totalCount > 0 && failedCount === totalCount,
    someFailed: failedCount > 0,
  };
}

export class ComicRenderIncompleteError extends Error {
  readonly renderedComic: RenderedComic;
  readonly summary: RenderFailureSummary;

  constructor(renderedComic: RenderedComic, summary: RenderFailureSummary) {
    const ids = summary.failedPanels.map((panel) => panel.id).join(", ");
    super(
      summary.allFailed
        ? `All ${summary.totalCount} comic panel image(s) failed to generate`
        : `Comic rendered with ${summary.failedCount}/${summary.totalCount} failed panel(s): ${ids}`,
    );
    this.name = "ComicRenderIncompleteError";
    this.renderedComic = renderedComic;
    this.summary = summary;
  }
}
