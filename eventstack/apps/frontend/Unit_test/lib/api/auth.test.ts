import { beforeEach, describe, expect, it, vi } from "vitest";

const httpMock = vi.fn();

vi.mock("../../../src/lib/http.js", () => ({
  http: httpMock,
}));

describe("lib/api/auth", () => {
  beforeEach(() => {
    httpMock.mockReset();
  });

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

  it("registers a new user", async () => {
    httpMock.mockResolvedValue({ token: "t" });
    const { register } = await import("../../../src/lib/api/auth.js");
    await register("user@test.dev", "secret", "ORGANIZER");
    expect(httpMock).toHaveBeenCalledWith(
      "/auth/register",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
