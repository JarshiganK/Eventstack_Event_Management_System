import { afterEach, describe, expect, it, vi } from "vitest";

const meMock = vi.fn();

vi.mock("../../src/lib/api.js", () => ({
  api: { me: meMock },
}));

afterEach(() => {
  localStorage.clear();
  meMock.mockReset();
});

describe("lib/auth", () => {
  it("stores and retrieves auth tokens", async () => {
    const { setToken, getToken, clearToken } = await import("../../src/lib/auth.js");
    setToken("token-123");
    expect(getToken()).toBe("token-123");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("fetches current role when available", async () => {
    meMock.mockResolvedValue({ user: { role: "ADMIN" } });
    const { fetchRole } = await import("../../src/lib/auth.js");
    await expect(fetchRole()).resolves.toBe("ADMIN");
  });
});
