import { describe, expect, it, vi } from "vitest";
import { cuid, iso } from "../../src/utils.js";

describe("utils", () => {
  it("creates cuid-like identifiers", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.1);
    const id = cuid();
    expect(id).toHaveLength(24);
    expect(id.startsWith("c")).toBe(true);
    randomSpy.mockRestore();
  });

  it("normalizes dates to ISO strings", () => {
    const timestamp = Date.UTC(2024, 0, 10, 12, 0, 0);
    expect(iso(timestamp)).toBe(new Date(timestamp).toISOString());
  });
});
