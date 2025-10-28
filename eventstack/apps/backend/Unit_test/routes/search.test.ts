import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("../../src/db.js", () => ({
  query: mocks.query,
}));

type HandlerCollection = ReturnType<typeof createMockFastify>["handlers"];

function findHandler(
  handlers: HandlerCollection,
  method: keyof HandlerCollection,
  path: string,
) {
  const mockFn = handlers[method] as any;
  const call = mockFn.mock.calls.find((entry: any[]) => entry[0] === path);
  if (!call) return undefined;
  if (call.length === 2) return call[1];
  return call[2];
}

describe("routes/search", () => {
  beforeEach(() => {
    mocks.query.mockReset();
  });

  it("registers search endpoint", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/search.js")).default;

    await registerRoutes(app);

    expect(handlers.get.mock.calls.map((call: any[]) => call[0])).toContain("/search");
  });

  it("returns search results when query provided", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/search.js")).default;
    await registerRoutes(app);

    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: "evt-1",
          title: "Concert",
          summary: "Live show",
          starts_at: "2024-01-01T10:00:00.000Z",
          ends_at: "2024-01-01T12:00:00.000Z",
          categories: ["music"],
          cover_url: "/cover.jpg",
          venue_name: "Hall",
        },
      ],
    });

    const handler = findHandler(handlers, "get", "/search") as (req: any) => Promise<any>;

    const result = await handler({
      query: { query: "concert", category: "music" },
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE"),
      ["concert", "music"],
    );
    expect(result).toEqual({
      results: [
        {
          id: "evt-1",
          title: "Concert",
          summary: "Live show",
          startsAt: "2024-01-01T10:00:00.000Z",
          endsAt: "2024-01-01T12:00:00.000Z",
          categories: ["music"],
          coverUrl: "/cover.jpg",
          venue: { id: undefined, name: "Hall" },
        },
      ],
    });
  });

  it("builds queries without category filters when omitted", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/search.js")).default;
    await registerRoutes(app);

    mocks.query.mockResolvedValueOnce({ rows: [] });

    const handler = findHandler(handlers, "get", "/search") as (req: any) => Promise<any>;
    await handler({ query: { query: "festival" } });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE"),
      ["festival"],
    );
  });

  it("returns empty results when query is blank", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/search.js")).default;
    await registerRoutes(app);

    const handler = findHandler(handlers, "get", "/search") as (req: any) => Promise<any>;
    const result = await handler({ query: { query: "   " } });

    expect(result).toEqual({ results: [] });
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
