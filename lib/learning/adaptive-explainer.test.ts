import { describe, expect, it } from "vitest";

import { parseAdaptation } from "./adaptive-explainer";

describe("parseAdaptation", () => {
  const valid = {
    adaptationType: "simpler",
    updatedInstructions: "Use shorter sentences and everyday words.",
    regenerate: ["story", "comic"],
  };

  it("parses a valid adaptation", () => {
    expect(parseAdaptation(valid)).toEqual(valid);
  });

  it("rejects invalid adaptationType", () => {
    expect(() =>
      parseAdaptation({ ...valid, adaptationType: "louder" }),
    ).toThrow(/adaptationType/);
  });

  it("rejects empty regenerate list", () => {
    expect(() =>
      parseAdaptation({ ...valid, regenerate: [] }),
    ).toThrow(/at least one module/);
  });

  it("rejects invalid regenerate targets", () => {
    expect(() =>
      parseAdaptation({ ...valid, regenerate: ["images"] }),
    ).toThrow(/regenerate/);
  });

  it("rejects empty instructions", () => {
    expect(() =>
      parseAdaptation({ ...valid, updatedInstructions: "" }),
    ).toThrow(/updatedInstructions/);
  });
});
