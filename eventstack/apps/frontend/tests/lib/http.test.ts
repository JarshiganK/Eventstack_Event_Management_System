import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

describe("lib/http", () => {
  beforeEach(() => {
    (globalThis as any).fetch = fetchMock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
      text: vi.fn(),
    });
  });

  afterEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
  });

  it("builds auth headers when a token exists", async () => {
    const { authHeader } = await import("../../src/lib/http.js");
    localStorage.setItem("token", "abc");
    expect(authHeader()).toEqual({ Authorization: "Bearer abc" });
  });

  it("performs JSON requests", async () => {
    const { http } = await import("../../src/lib/http.js");
    await http("/events");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/events"),
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });
});
