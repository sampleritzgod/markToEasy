import { describe, expect, it } from "vitest";

import { clampDialogue, parseComicPlan } from "./comic-planner";

function makePanel(id: number) {
  return {
    id,
    scene: `Scene ${id}`,
    narration: `Narration ${id}`,
    dialogue: "Hello!",
    visualDescription: `Visual ${id}`,
    learningPoint: `Point ${id}`,
  };
}

describe("parseComicPlan", () => {
  const valid = {
    title: "DNS Comic",
    panels: Array.from({ length: 6 }, (_, i) => makePanel(i + 1)),
  };

  it("parses a 6-panel plan", () => {
    const plan = parseComicPlan(valid);
    expect(plan.panels).toHaveLength(6);
    expect(plan.title).toBe("DNS Comic");
  });

  it("accepts 8 panels", () => {
    const plan = parseComicPlan({
      title: "Long",
      panels: Array.from({ length: 8 }, (_, i) => makePanel(i + 1)),
    });
    expect(plan.panels).toHaveLength(8);
  });

  it("rejects fewer than 6 panels", () => {
    expect(() =>
      parseComicPlan({
        title: "Short",
        panels: Array.from({ length: 5 }, (_, i) => makePanel(i + 1)),
      }),
    ).toThrow(/6-8 panels/);
  });

  it("rejects more than 8 panels", () => {
    expect(() =>
      parseComicPlan({
        title: "Too long",
        panels: Array.from({ length: 9 }, (_, i) => makePanel(i + 1)),
      }),
    ).toThrow(/6-8 panels/);
  });

  it("rejects non-sequential panel ids", () => {
    const panels = Array.from({ length: 6 }, (_, i) => makePanel(i + 1));
    panels[2].id = 99;
    expect(() => parseComicPlan({ title: "Bad ids", panels })).toThrow(
      /panel id must be 3/,
    );
  });

  it("allows empty dialogue", () => {
    const panels = Array.from({ length: 6 }, (_, i) => ({
      ...makePanel(i + 1),
      dialogue: "",
    }));
    expect(parseComicPlan({ title: "Silent", panels }).panels[0].dialogue).toBe(
      "",
    );
  });

  it("clamps dialogue to at most 2 sentences instead of failing", () => {
    const panels = Array.from({ length: 6 }, (_, i) => makePanel(i + 1));
    panels[0].dialogue = "One. Two. Three.";
    const plan = parseComicPlan({ title: "Chatty", panels });
    expect(plan.panels[0].dialogue).toBe("One. Two.");
  });

  it("rejects missing panels array", () => {
    expect(() => parseComicPlan({ title: "No panels" })).toThrow(/panels/);
  });
});

describe("clampDialogue", () => {
  it("returns empty for blank input", () => {
    expect(clampDialogue("")).toBe("");
    expect(clampDialogue("   ")).toBe("");
  });

  it("keeps short dialogue unchanged", () => {
    expect(clampDialogue("Hello there!")).toBe("Hello there!");
  });
});
