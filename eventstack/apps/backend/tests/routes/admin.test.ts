import { describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => {
  const client = {
    query: vi.fn().mockResolvedValue({ rows: [{ count: "0" }] }),
    release: vi.fn(),
  };
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    pool: { connect: vi.fn().mockResolvedValue(client) },
    requireAdmin: vi.fn(),
  };
});

vi.mock("../../src/db.js", () => ({
  query: mocks.query,
  pool: mocks.pool,
}));

vi.mock("../../src/auth.js", () => ({
  requireAdmin: mocks.requireAdmin,
}));

describe("routes/admin", () => {
  it("registers admin management endpoints", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/admin.js")).default;

    await registerRoutes(app);

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE users"),
    );

    const getPaths = handlers.get.mock.calls.map((call) => call[0]);
    expect(getPaths).toContain("/admin/analytics");
    expect(getPaths).toContain("/admin/users");

    const analyticsCall = handlers.get.mock.calls.find(
      (call) => call[0] === "/admin/analytics",
    );
    expect(analyticsCall?.[1]).toEqual({ preHandler: mocks.requireAdmin });

    const userListCall = handlers.get.mock.calls.find(
      (call) => call[0] === "/admin/users",
    );
    expect(userListCall?.[1]).toEqual({ preHandler: mocks.requireAdmin });

    const patchPaths = handlers.patch.mock.calls.map((call) => call[0]);
    expect(patchPaths).toContain("/admin/users/:id/role");
    expect(patchPaths).toContain("/admin/users/:id/status");

    const deleteCall = handlers.delete.mock.calls.find(
      (call) => call[0] === "/admin/users/:id",
    );
    expect(deleteCall?.[1]).toEqual({ preHandler: mocks.requireAdmin });
  });
});
