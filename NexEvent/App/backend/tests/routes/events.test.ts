import { describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  requireOrganizerOrAdmin: vi.fn(),
}));

vi.mock("../../src/db.js", () => ({
  query: mocks.query,
}));

vi.mock("../../src/auth.js", () => ({
  requireOrganizerOrAdmin: mocks.requireOrganizerOrAdmin,
}));

describe("routes/events", () => {
  it("registers event CRUD endpoints", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/events.js")).default;

    await registerRoutes(app);

    const getPaths = handlers.get.mock.calls.map((call) => call[0]);
    expect(getPaths).toContain("/events");
    expect(getPaths).toContain("/events/:id");

    const postMap = new Map(handlers.post.mock.calls.map((call) => [call[0], call]));
    expect(postMap.has("/admin/events")).toBe(true);
    expect(postMap.has("/admin/events/:id/images")).toBe(true);

    const adminEventCall = postMap.get("/admin/events");
    expect(adminEventCall?.[1]).toEqual({ preHandler: mocks.requireOrganizerOrAdmin });

    const imageCall = postMap.get("/admin/events/:id/images");
    expect(imageCall?.[1]).toEqual({ preHandler: mocks.requireOrganizerOrAdmin });

    const putCall = handlers.put.mock.calls.find((call) => call[0] === "/admin/events/:id");
    expect(putCall?.[1]).toEqual({ preHandler: mocks.requireOrganizerOrAdmin });

    const deleteCall = handlers.delete.mock.calls.find((call) => call[0] === "/admin/events/:id");
    expect(deleteCall?.[1]).toEqual({ preHandler: mocks.requireOrganizerOrAdmin });
  });
});
