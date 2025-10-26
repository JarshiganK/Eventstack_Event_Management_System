import { describe, expect, it, vi } from "vitest";

const httpMock = vi.fn();

vi.mock("../../../src/lib/http.js", () => ({
  http: httpMock,
}));

describe("lib/api/auth", () => {
  it("posts credentials when logging in", async () => {
    httpMock.mockResolvedValue({ token: "abc" });
    const { login } = await import("../../../src/lib/api/auth.js");
    await login("user@test.dev", "pass123");
    expect(httpMock).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("fetches current user profile", async () => {
    httpMock.mockResolvedValue({ user: { id: "1" } });
    const { me } = await import("../../../src/lib/api/auth.js");
    await me();
    expect(httpMock).toHaveBeenCalledWith("/auth/me");
  });
});
