import { describe, expect, it } from "vitest";

import { parseConversationContext } from "./context-manager";

describe("parseConversationContext", () => {
  const valid = {
    resolvedQuestion: "Explain DNS resolution",
    currentTopic: "DNS",
    referencedConcepts: ["resolver"],
    contextSummary: "User asked a follow-up about DNS.",
  };

  it("parses a valid context", () => {
    expect(parseConversationContext(valid)).toEqual(valid);
  });

  it("allows empty referencedConcepts", () => {
    expect(
      parseConversationContext({ ...valid, referencedConcepts: [] })
        .referencedConcepts,
    ).toEqual([]);
  });

  it("rejects empty resolvedQuestion", () => {
    expect(() =>
      parseConversationContext({ ...valid, resolvedQuestion: "" }),
    ).toThrow(/resolvedQuestion/);
  });

  it("rejects non-array referencedConcepts", () => {
    expect(() =>
      parseConversationContext({
        ...valid,
        referencedConcepts: "resolver",
      }),
    ).toThrow(/referencedConcepts/);
  });
});
