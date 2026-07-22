import { describe, expect, it } from "vitest";

import { applyCorrectedPanels } from "./apply-corrected-panels";
import type { ComicPlan } from "./types";

const comicPlan: ComicPlan = {
  title: "DNS",
  panels: [
    {
      id: 1,
      scene: "s1",
      narration: "n1",
      dialogue: "d1",
      visualDescription: "v1",
      learningPoint: "p1",
    },
    {
      id: 2,
      scene: "s2",
      narration: "n2",
      dialogue: "",
      visualDescription: "v2",
      learningPoint: "p2",
    },
  ],
};

describe("applyCorrectedPanels", () => {
  it("returns the same plan when there are no corrections", () => {
    expect(applyCorrectedPanels(comicPlan, [])).toEqual(comicPlan);
  });

  it("merges corrections by panel id", () => {
    const result = applyCorrectedPanels(comicPlan, [
      {
        id: 1,
        scene: "fixed",
        narration: "fixed-n",
        dialogue: "",
        visualDescription: "fixed-v",
        learningPoint: "fixed-p",
      },
    ]);

    expect(result.panels[0].scene).toBe("fixed");
    expect(result.panels[0].narration).toBe("fixed-n");
    expect(result.panels[1]).toEqual(comicPlan.panels[1]);
  });

  it("ignores corrections for unknown panel ids", () => {
    const result = applyCorrectedPanels(comicPlan, [
      {
        id: 99,
        scene: "ghost",
        narration: "ghost",
        dialogue: "",
        visualDescription: "ghost",
        learningPoint: "ghost",
      },
    ]);

    expect(result.panels).toEqual(comicPlan.panels);
  });
});
