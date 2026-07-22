import { describe, expect, it } from "vitest";

import {
  formatCitation,
  formatMessageTime,
  getChatTitle,
  groupChatsByDate,
  parseChunkNumber,
  relativeTime,
} from "./chat-ui";

describe("relativeTime", () => {
  it("returns Just now for recent timestamps", () => {
    expect(relativeTime(new Date().toISOString())).toBe("Just now");
  });

  it("returns minutes ago", () => {
    const fiveMinsAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(relativeTime(fiveMinsAgo)).toBe("5m ago");
  });
});

describe("groupChatsByDate", () => {
  it("returns empty for empty list", () => {
    expect(groupChatsByDate([])).toEqual([]);
  });

  it("groups today's chats under Today", () => {
    const groups = groupChatsByDate([
      {
        id: "1",
        title: "Today chat",
        updatedAt: new Date().toISOString(),
      },
    ]);
    expect(groups[0]?.label).toBe("Today");
    expect(groups[0]?.chats).toHaveLength(1);
  });
});

describe("getChatTitle", () => {
  it("returns New conversation when no active chat", () => {
    expect(getChatTitle([], null)).toBe("New conversation");
  });

  it("returns Conversation when id not found", () => {
    expect(getChatTitle([], "missing")).toBe("Conversation");
  });

  it("returns matching title", () => {
    expect(
      getChatTitle(
        [{ id: "a", title: "DNS", updatedAt: "" }],
        "a",
      ),
    ).toBe("DNS");
  });
});

describe("formatCitation", () => {
  it("formats lesson and timestamps", () => {
    expect(
      formatCitation({
        lesson: "Intro",
        startTimestamp: "00:00:01.000",
        endTimestamp: "00:00:05.000",
      }),
    ).toBe("Intro (00:00:01.000 → 00:00:05.000)");
  });
});

describe("parseChunkNumber", () => {
  it("parses trailing index and adds one", () => {
    expect(parseChunkNumber("intro-0")).toBe(1);
    expect(parseChunkNumber("intro-4")).toBe(5);
  });

  it("returns null for missing/invalid", () => {
    expect(parseChunkNumber(null)).toBeNull();
    expect(parseChunkNumber(undefined)).toBeNull();
    expect(parseChunkNumber("")).toBeNull();
    expect(parseChunkNumber("no-number")).toBeNull();
  });
});

describe("formatMessageTime", () => {
  it("returns null for empty", () => {
    expect(formatMessageTime()).toBeNull();
    expect(formatMessageTime("")).toBeNull();
  });

  it("formats a valid date string", () => {
    const formatted = formatMessageTime("2024-01-15T10:30:00.000Z");
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe("string");
  });
});
