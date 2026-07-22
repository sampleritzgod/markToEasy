import { describe, expect, it } from "vitest";

import {
  asNonEmptyString,
  asStringList,
  parseModelJson,
  requireModelContent,
} from "./shared";

describe("shared learning helpers", () => {
  it("asNonEmptyString trims and rejects empties", () => {
    expect(asNonEmptyString("  hi  ", "f", "x")).toBe("hi");
    expect(() => asNonEmptyString("", "f", "x")).toThrow(/f/);
  });

  it("asStringList filters non-strings", () => {
    expect(asStringList(["a", 1, " b "], "f", "x")).toEqual(["a", "b"]);
    expect(() => asStringList("nope", "f", "x")).toThrow(/array/);
  });

  it("parseModelJson and requireModelContent", () => {
    expect(parseModelJson('{"a":1}', "t")).toEqual({ a: 1 });
    expect(() => parseModelJson("nope", "t")).toThrow(/Failed to parse/);
    expect(requireModelContent("  ok  ", "t")).toBe("ok");
    expect(() => requireModelContent("  ", "t")).toThrow(/No t returned/);
  });
});
