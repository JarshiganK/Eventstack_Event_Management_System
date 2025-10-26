import { describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("../../src/db.js", () => ({
  query: mocks.query,
}));

vi.mock("../../src/auth.js", () => ({
  requireUser: mocks.requireUser,
}));

describe("routes/bookmarks", () => {
  it("registers bookmark management endpoints", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/bookmarks.js")).default;

    await registerRoutes(app);

    expect(handlers.get).toHaveBeenCalledWith(
      "/me/bookmarks",
      { preHandler: mocks.requireUser },
      expect.any(Function),
    );
    expect(handlers.post).toHaveBeenCalledWith(
      "/me/bookmarks",
      { preHandler: mocks.requireUser },
      expect.any(Function),
    );
    expect(handlers.delete).toHaveBeenCalledWith(
      "/me/bookmarks/:eventId",
      { preHandler: mocks.requireUser },
      expect.any(Function),
    );
  });
});
