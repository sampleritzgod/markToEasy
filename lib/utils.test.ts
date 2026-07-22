import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditional falsy values", () => {
    expect(cn("base", false && "hidden", undefined, null, "ok")).toBe("base ok");
  });

  it("dedupes conflicting tailwind classes via twMerge", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles empty call", () => {
    expect(cn()).toBe("");
  });
});
