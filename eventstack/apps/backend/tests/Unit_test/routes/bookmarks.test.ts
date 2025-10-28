import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("../../../src/db.js", () => ({
  query: mocks.query,
}));

vi.mock("../../../src/auth.js", () => ({
  requireUser: mocks.requireUser,
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
  return call[2];
}

function createReply() {
  return {
    statusCode: undefined as number | undefined,
    payload: undefined as unknown,
    sent: false,
    code(this: any, status: number) {
      this.statusCode = status;
      return this;
    },
    send(this: any, value: unknown) {
      this.payload = value;
      this.sent = true;
      return this;
    },
  };
}

describe("routes/bookmarks", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.requireUser.mockReset();
  });

  it("registers bookmark management endpoints", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/bookmarks.js")).default;

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

  it("lists bookmarks for the signed-in user", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/bookmarks.js")).default;
    await registerRoutes(app);

    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: "evt-1",
          title: "Concert",
          summary: "Live",
          starts_at: "2024-01-01T00:00:00.000Z",
          ends_at: "2024-01-01T02:00:00.000Z",
          cover_url: "/cover.jpg",
          venue_name: "Hall",
        },
      ],
    });

    const handler = findHandler(handlers, "get", "/me/bookmarks") as (
      req: any,
    ) => Promise<any>;
    const result = await handler({ user: { id: "u1" } });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM bookmarks"),
      ["u1"],
    );
    expect(result).toEqual([
      {
        id: "evt-1",
        title: "Concert",
        summary: "Live",
        startsAt: "2024-01-01T00:00:00.000Z",
        endsAt: "2024-01-01T02:00:00.000Z",
        coverUrl: "/cover.jpg",
        venue: { id: undefined, name: "Hall" },
      },
    ]);
  });

  it("creates and removes bookmarks", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/bookmarks.js")).default;
    await registerRoutes(app);

    mocks.query.mockResolvedValue({});

    const createHandler = findHandler(handlers, "post", "/me/bookmarks") as (
      req: any,
      reply: any,
    ) => Promise<any>;

    const reply = createReply();
    await createHandler({ user: { id: "u1" }, body: { eventId: "evt-1" } }, reply);

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO bookmarks"),
      expect.arrayContaining(["u1", "evt-1"]),
    );
    expect(reply.statusCode).toBe(201);

    const deleteHandler = findHandler(
      handlers,
      "delete",
      "/me/bookmarks/:eventId",
    ) as (req: any) => Promise<any>;

    await deleteHandler({ user: { id: "u1" }, params: { eventId: "evt-1" } });
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM bookmarks"),
      ["u1", "evt-1"],
    );
  });

  it("ignores duplicate bookmarks during creation", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/bookmarks.js")).default;
    await registerRoutes(app);

    const createHandler = findHandler(handlers, "post", "/me/bookmarks") as (
      req: any,
      reply: any,
    ) => Promise<any>;

    mocks.query.mockRejectedValueOnce(new Error("duplicate"));

    const reply = createReply();
    await createHandler({ user: { id: "u1" }, body: { eventId: "evt-1" } }, reply);

    expect(reply.statusCode).toBe(201);
    expect(reply.payload).toEqual({ ok: true });
  });
});
