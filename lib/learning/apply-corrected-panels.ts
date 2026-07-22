import type { ComicPanel, ComicPlan } from "./types";

/** Merge validator corrections into the comic plan by panel id. */
export function applyCorrectedPanels(
  comicPlan: ComicPlan,
  correctedPanels: ComicPanel[],
): ComicPlan {
  if (!correctedPanels.length) {
    return comicPlan;
  }

  const byId = new Map(correctedPanels.map((panel) => [panel.id, panel]));

  return {
    ...comicPlan,
    panels: comicPlan.panels.map((panel) => byId.get(panel.id) ?? panel),
  };
}
