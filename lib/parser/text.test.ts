import { describe, expect, it } from "vitest";

import { cleanSubtitleText } from "./text";

describe("cleanSubtitleText", () => {
  it("strips HTML-like tags", () => {
    expect(cleanSubtitleText("<b>Hello</b> world")).toBe("Hello world");
  });

  it("strips curly brace cue settings", () => {
    expect(cleanSubtitleText("{\\an8}Aligned text")).toBe("Aligned text");
  });

  it("collapses whitespace", () => {
    expect(cleanSubtitleText("  one   two\tthree  ")).toBe("one two three");
  });

  it("returns empty string for empty/whitespace input", () => {
    expect(cleanSubtitleText("")).toBe("");
    expect(cleanSubtitleText("   ")).toBe("");
  });

  it("handles nested tags", () => {
    expect(cleanSubtitleText("<i><b>Bold</b></i>")).toBe("Bold");
  });
});
