import { describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => ({
  requireOrganizerOrAdmin: vi.fn(),
}));

vi.mock("../../src/auth.js", () => ({
  requireOrganizerOrAdmin: mocks.requireOrganizerOrAdmin,
}));

describe("routes/uploads", () => {
  it("registers upload endpoint", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/uploads.js")).default;

    await registerRoutes(app);

    const call = handlers.post.mock.calls.find((args) => args[0] === "/admin/uploads");
    expect(call?.[1]).toEqual({ preHandler: mocks.requireOrganizerOrAdmin });
    expect(call?.[2]).toBeTypeOf("function");
  });
});
