import { describe, expect, it } from "vitest";

import { isGptImageModel } from "./image-provider";

describe("isGptImageModel", () => {
  it("detects gpt-image family", () => {
    expect(isGptImageModel("gpt-image-1")).toBe(true);
    expect(isGptImageModel("gpt-image-1-mini")).toBe(true);
    expect(isGptImageModel("gpt-image-2")).toBe(true);
    expect(isGptImageModel("chatgpt-image-latest")).toBe(true);
  });

  it("rejects dall-e models", () => {
    expect(isGptImageModel("dall-e-3")).toBe(false);
    expect(isGptImageModel("dall-e-2")).toBe(false);
  });
});
