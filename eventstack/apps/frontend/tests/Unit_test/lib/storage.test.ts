import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  localStorage.clear();
});

describe("lib/storage", () => {
  it("adds unique bookmarks", async () => {
    const { addLocalBookmark, getLocalBookmarks } = await import("../../../src/lib/storage.js");
    addLocalBookmark("evt-1");
    addLocalBookmark("evt-1");
    expect(getLocalBookmarks()).toEqual([{ id: "evt-1" }]);
  });

  it("removes bookmarks cleanly", async () => {
    const { addLocalBookmark, removeLocalBookmark, getLocalBookmarks } = await import(
      "../../../src/lib/storage.js"
    );
    addLocalBookmark("evt-1");
    removeLocalBookmark("evt-1");
    expect(getLocalBookmarks()).toEqual([]);
  });
});
