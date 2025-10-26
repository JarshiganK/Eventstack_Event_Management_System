import { describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => {
  return {
    query: vi.fn(),
    cuid: vi.fn(),
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
    signJwt: vi.fn(),
    requireUser: vi.fn(),
  };
});

vi.mock("../../src/db.js", () => ({
  query: mocks.query,
}));

vi.mock("../../src/utils.js", () => ({
  cuid: mocks.cuid,
}));

vi.mock("../../src/auth.js", () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
  signJwt: mocks.signJwt,
  requireUser: mocks.requireUser,
}));

describe("routes/auth", () => {
  it("registers auth endpoints", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/auth.js")).default;

    await registerRoutes(app);

    expect(handlers.post).toHaveBeenCalledWith(
      "/auth/register",
      expect.any(Function),
    );
    expect(handlers.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function),
    );
    expect(handlers.get).toHaveBeenCalledWith(
      "/auth/me",
      { preHandler: mocks.requireUser },
      expect.any(Function),
    );
  });
});
