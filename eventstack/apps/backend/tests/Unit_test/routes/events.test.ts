import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  requireOrganizerOrAdmin: vi.fn(),
  cuid: vi.fn(),
}));

vi.mock("../../../src/db.js", () => ({
  query: mocks.query,
}));

vi.mock("../../../src/auth.js", () => ({
  requireOrganizerOrAdmin: mocks.requireOrganizerOrAdmin,
}));

type HandlerCollection = ReturnType<typeof createMockFastify>["handlers"];

vi.mock("../../../src/utils.js", () => ({
  cuid: mocks.cuid,
  iso: (input: string | number | Date) => new Date(input).toISOString(),
}));

function findHandler(
  handlerFns: HandlerCollection,
  method: keyof HandlerCollection,
  path: string,
) {
  const mockFn = handlerFns[method] as any;
  const call = mockFn.mock.calls.find(
    (entry: any[]) => entry[0] === path,
  );
  if (!call) return undefined;
  if (call.length === 2) return call[1];
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

describe("routes/events", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.requireOrganizerOrAdmin.mockReset();
    mocks.cuid.mockReset();
  });

  it("registers event CRUD endpoints", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/events.js")).default;

    await registerRoutes(app);

    const getPaths = handlers.get.mock.calls.map((call: any[]) => call[0]);
    expect(getPaths).toContain("/events");
    expect(getPaths).toContain("/events/:id");

    const postMap = new Map(
      handlers.post.mock.calls.map((call: any[]) => [call[0], call]),
    );
    expect(postMap.has("/admin/events")).toBe(true);
    expect(postMap.has("/admin/events/:id/images")).toBe(true);

    const adminEventCall = postMap.get("/admin/events");
    expect(adminEventCall?.[1]).toEqual({
      preHandler: mocks.requireOrganizerOrAdmin,
    });

    const imageCall = postMap.get("/admin/events/:id/images");
    expect(imageCall?.[1]).toEqual({
      preHandler: mocks.requireOrganizerOrAdmin,
    });

    const putCall = handlers.put.mock.calls.find(
      (call: any[]) => call[0] === "/admin/events/:id",
    );
    expect(putCall?.[1]).toEqual({ preHandler: mocks.requireOrganizerOrAdmin });

    const deleteCall = handlers.delete.mock.calls.find(
      (call: any[]) => call[0] === "/admin/events/:id",
    );
    expect(deleteCall?.[1]).toEqual({
      preHandler: mocks.requireOrganizerOrAdmin,
    });
  });

  it("lists events with filters", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/events.js")).default;
    await registerRoutes(app);

    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: "evt1",
          title: "Concert",
          summary: "Live music",
          starts_at: "2024-01-01T18:00:00.000Z",
          ends_at: "2024-01-01T21:00:00.000Z",
          categories: ["music"],
          cover_url: "/cover.jpg",
          venue_name: "Main Hall",
        },
      ],
    });

    const handler = findHandler(handlers, "get", "/events") as (
      req: any,
    ) => Promise<any>;

    const result = await handler({
      query: { from: "2024-01-01", to: "2024-01-02", category: "music" },
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM events"),
      ["2024-01-01", "2024-01-02", "music"],
    );
    expect(result).toEqual([
      {
        id: "evt1",
        title: "Concert",
        summary: "Live music",
        startsAt: "2024-01-01T18:00:00.000Z",
        endsAt: "2024-01-01T21:00:00.000Z",
        categories: ["music"],
        coverUrl: "/cover.jpg",
        venue: { name: "Main Hall" },
      },
    ]);
  });

  it("returns event details with images", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/events.js")).default;
    await registerRoutes(app);

    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: "evt1",
          title: "Concert",
          summary: "Live music",
          starts_at: "2024-01-01T18:00:00.000Z",
          ends_at: "2024-01-01T21:00:00.000Z",
          categories: ["music"],
          cover_url: "/cover.jpg",
          venue_name: "Main Hall",
        },
      ],
    });
    mocks.query.mockResolvedValueOnce({
      rows: [{ url: "image.jpg", ord: 0 }],
    });

    const handler = findHandler(handlers, "get", "/events/:id") as (
      req: any,
      reply: any,
    ) => Promise<any>;

    const reply = createReply();
    const result = await handler({ params: { id: "evt1" } }, reply);

    expect(reply.sent).toBe(false);
    expect(result).toEqual({
      id: "evt1",
      title: "Concert",
      summary: "Live music",
      startsAt: "2024-01-01T18:00:00.000Z",
      endsAt: "2024-01-01T21:00:00.000Z",
      categories: ["music"],
      images: [{ url: "image.jpg", ord: 0 }],
      venue: { name: "Main Hall" },
    });
  });

  it("responds with 404 when event is missing", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/events.js")).default;
    await registerRoutes(app);

    mocks.query.mockResolvedValueOnce({ rows: [] });

    const handler = findHandler(handlers, "get", "/events/:id") as (
      req: any,
      reply: any,
    ) => Promise<any>;

    const reply = createReply();
    await handler({ params: { id: "missing" } }, reply);

    expect(reply.statusCode).toBe(404);
    expect(reply.payload).toEqual({ error: "Not found" });
  });

  it("creates and updates admin events", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/events.js")).default;
    await registerRoutes(app);

    mocks.cuid.mockReturnValue("evt-new");
    mocks.query.mockResolvedValue({});

    const createHandler = findHandler(
      handlers,
      "post",
      "/admin/events",
    ) as (req: any) => Promise<any>;

    const createResult = await createHandler({
      body: {
        title: "New Event",
        summary: "Summary",
        startsAt: "2024-01-01T10:00:00.000Z",
        endsAt: "2024-01-01T12:00:00.000Z",
        venueName: "Hall",
        categoriesCsv: "music,live",
      },
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO events"),
      expect.arrayContaining([
        "evt-new",
        "New Event",
        "Summary",
        "2024-01-01T10:00:00.000Z",
      ]),
    );
    expect(createResult).toEqual({ id: "evt-new" });

    const updateHandler = findHandler(
      handlers,
      "put",
      "/admin/events/:id",
    ) as (req: any) => Promise<any>;

    mocks.query.mockResolvedValue({});

    const updateResult = await updateHandler({
      params: { id: "evt-new" },
      body: {
        title: "Updated",
        summary: "Updated summary",
        startsAt: "2024-01-02T10:00:00.000Z",
        endsAt: "2024-01-02T12:00:00.000Z",
        venueName: "Updated Hall",
        categoriesCsv: "music",
      },
    });

    expect(mocks.query).toHaveBeenLastCalledWith(
      expect.stringContaining("UPDATE events SET"),
      expect.arrayContaining(["Updated", "Updated summary"]),
    );
    expect(updateResult).toEqual({ id: "evt-new" });
  });

  it("returns 404 when adding an image to a missing event", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/events.js")).default;
    await registerRoutes(app);

    const addImageHandler = findHandler(
      handlers,
      "post",
      "/admin/events/:id/images",
    ) as (req: any, reply: any) => Promise<any>;

    mocks.query.mockResolvedValueOnce({ rows: [] });

    const reply = createReply();
    await addImageHandler(
      { params: { id: "missing" }, body: { url: "/img.png" } },
      reply,
    );

    expect(reply.statusCode).toBe(404);
    expect(reply.payload).toEqual({ error: "Event not found" });
  });

  it("adds images and deletes events", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/events.js")).default;
    await registerRoutes(app);

    // add image sequence
    mocks.query.mockResolvedValueOnce({
      rows: [{ id: "evt-new" }],
    });
    mocks.query.mockResolvedValueOnce({
      rows: [{ max: 2 }],
    });
    mocks.query.mockResolvedValueOnce({});

    const addImageHandler = findHandler(
      handlers,
      "post",
      "/admin/events/:id/images",
    ) as (req: any, reply: any) => Promise<any>;

    mocks.cuid.mockReturnValueOnce("img-1");

    const imageResult = await addImageHandler({
      params: { id: "evt-new" },
      body: { url: "/img.png", width: 100 },
    });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO event_images"),
      expect.arrayContaining(["evt-new", "/img.png"]),
    );
    expect(imageResult).toEqual({ id: "img-1", url: "/img.png", ord: 3 });

    // delete
    mocks.query.mockResolvedValueOnce({});

    const deleteHandler = findHandler(
      handlers,
      "delete",
      "/admin/events/:id",
    ) as (req: any) => Promise<any>;

    const deleteResult = await deleteHandler({ params: { id: "evt-new" } });
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM events"),
      ["evt-new"],
    );
    expect(deleteResult).toEqual({ id: "evt-new" });
  });
});
