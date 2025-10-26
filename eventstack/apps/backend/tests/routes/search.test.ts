import { describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("../../src/db.js", () => ({
  query: mocks.query,
}));

describe("routes/search", () => {
  it("registers search endpoint", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/search.js")).default;

    await registerRoutes(app);

    expect(handlers.get.mock.calls.map((call) => call[0])).toContain("/search");
  });
});
