import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  pool: { connect: vi.fn() },
  requireAdmin: vi.fn(),
}));

const client = {
  query: vi.fn(),
  release: vi.fn(),
};

mocks.pool.connect.mockResolvedValue(client);

vi.mock("../../src/db.js", () => ({
  query: mocks.query,
  pool: mocks.pool,
}));

vi.mock("../../src/auth.js", () => ({
  requireAdmin: mocks.requireAdmin,
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

function mockClientQueries(values: Array<{ rows: any[] }>) {
  client.query.mockReset();
  values.forEach((value) => {
    client.query.mockResolvedValueOnce(value);
  });
}

describe("routes/admin", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.requireAdmin.mockReset();
    mocks.pool.connect.mockReset();
    mocks.pool.connect.mockResolvedValue(client);
    client.query.mockReset();
    client.release.mockReset();
  });

  it("registers admin management endpoints", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/admin.js")).default;

    mocks.query.mockResolvedValue({ rows: [] });
    await registerRoutes(app);

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE users"),
    );

    const getPaths = handlers.get.mock.calls.map((call: any[]) => call[0]);
    expect(getPaths).toContain("/admin/analytics");
    expect(getPaths).toContain("/admin/users");

    const analyticsCall = handlers.get.mock.calls.find(
      (call: any[]) => call[0] === "/admin/analytics",
    );
    expect(analyticsCall?.[1]).toEqual({ preHandler: mocks.requireAdmin });

    const userListCall = handlers.get.mock.calls.find(
      (call: any[]) => call[0] === "/admin/users",
    );
    expect(userListCall?.[1]).toEqual({ preHandler: mocks.requireAdmin });

    const patchPaths = handlers.patch.mock.calls.map((call: any[]) => call[0]);
    expect(patchPaths).toContain("/admin/users/:id/role");
    expect(patchPaths).toContain("/admin/users/:id/status");

    const deleteCall = handlers.delete.mock.calls.find(
      (call: any[]) => call[0] === "/admin/users/:id",
    );
    expect(deleteCall?.[1]).toEqual({ preHandler: mocks.requireAdmin });
  });

  it("returns analytics data", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/admin.js")).default;
    mocks.query.mockResolvedValue({ rows: [] });
    await registerRoutes(app);
    mocks.query.mockReset();
    mocks.query.mockResolvedValue({ rows: [] });

    mockClientQueries([
      { rows: [{ count: "5" }] }, // events
      { rows: [{ count: "10" }] }, // users
      { rows: [{ count: "2" }] }, // active events
      { rows: [{ count: "3" }] }, // upcoming
      {
        rows: [
          { category: "music", count: "4" },
          { category: "sports", count: "2" },
        ],
      },
    ]);

    const handler = findHandler(
      handlers,
      "get",
      "/admin/analytics",
    ) as (req: any, reply: any) => Promise<any>;

    const reply = { send: vi.fn() };
    await handler({}, reply);

    expect(client.query).toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith({
      totalEvents: 5,
      totalUsers: 10,
      activeEvents: 2,
      upcomingEvents: 3,
      categoriesDistribution: [
        { category: "music", count: 4 },
        { category: "sports", count: 2 },
      ],
    });
  });

  it("lists users with optional role filter", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/admin.js")).default;
    mocks.query.mockResolvedValue({ rows: [] });
    await registerRoutes(app);
    mocks.query.mockReset();
    mocks.query.mockResolvedValue({ rows: [] });

    mocks.query.mockResolvedValueOnce({
      rows: [
        { id: "u1", email: "a@test.dev", role: "USER", status: "ACTIVE", created_at: "2024-01-01" },
      ],
    });

    const handler = findHandler(
      handlers,
      "get",
      "/admin/users",
    ) as (req: any) => Promise<any>;

    const result = await handler({ query: { role: "user" } });

    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM users"),
      ["USER"],
    );
    expect(result).toEqual([
      {
        id: "u1",
        email: "a@test.dev",
        role: "USER",
        status: "ACTIVE",
        created_at: "2024-01-01",
      },
    ]);
  });

  it("updates user roles and statuses", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/admin.js")).default;
    mocks.query.mockResolvedValue({ rows: [] });
    await registerRoutes(app);
    mocks.query.mockReset();
    mocks.query.mockResolvedValue({ rows: [] });

    // role update
    mocks.query
      .mockResolvedValueOnce({ rows: [{ count: "1" }] }) // remaining admins
      .mockResolvedValueOnce({ rows: [{ role: "ADMIN" }] }) // current role
      .mockResolvedValueOnce({}); // update

    const roleHandler = findHandler(
      handlers,
      "patch",
      "/admin/users/:id/role",
    ) as (req: any, reply: any) => Promise<any>;

    const roleReply = createReply();
    const roleResult = await roleHandler(
      { params: { id: "user-1" }, body: { role: "USER" } },
      roleReply,
    );

    expect(mocks.query).toHaveBeenLastCalledWith(
      expect.stringContaining("UPDATE users SET role"),
      ["user-1", "USER"],
    );
    expect(roleReply.sent).toBe(false);
    expect(roleResult).toEqual({ id: "user-1", role: "USER" });

    // status update
    mocks.query.mockResolvedValueOnce({});

    const statusHandler = findHandler(
      handlers,
      "patch",
      "/admin/users/:id/status",
    ) as (req: any) => Promise<any>;

    const statusResult = await statusHandler({
      params: { id: "user-1" },
      body: { status: "SUSPENDED" },
    });

    expect(mocks.query).toHaveBeenLastCalledWith(
      expect.stringContaining("UPDATE users SET status"),
      ["user-1", "SUSPENDED"],
    );
    expect(statusResult).toEqual({ id: "user-1", status: "SUSPENDED" });
  });

  it("rejects demoting the final administrator", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/admin.js")).default;
    mocks.query.mockResolvedValue({ rows: [] });
    await registerRoutes(app);
    mocks.query.mockReset();

    const roleHandler = findHandler(
      handlers,
      "patch",
      "/admin/users/:id/role",
    ) as (req: any, reply: any) => Promise<any>;

    mocks.query
      .mockResolvedValueOnce({ rows: [{ count: "0" }] }) // remaining admins
      .mockResolvedValueOnce({ rows: [{ role: "ADMIN" }] }); // current role

    const reply = createReply();
    await roleHandler(
      { params: { id: "admin-1" }, body: { role: "USER" } },
      reply,
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ error: "Cannot demote the last admin" });
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });

  it("deletes users while preventing last-admin removal", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/admin.js")).default;
    mocks.query.mockResolvedValue({ rows: [] });
    await registerRoutes(app);
    mocks.query.mockReset();
    mocks.query.mockResolvedValue({ rows: [] });

    // Attempt delete of non-admin user
    const deleteHandler = findHandler(
      handlers,
      "delete",
      "/admin/users/:id",
    ) as (req: any, reply: any) => Promise<any>;

    // Provide query results sequentially as route expects:
    mocks.query
      .mockResolvedValueOnce({ rows: [{ role: "USER" }] }) // fetch role
      .mockResolvedValueOnce({}); // delete

    const result = await deleteHandler(
      { params: { id: "user-1" }, user: { id: "admin-1" } },
      createReply(),
    );

    expect(mocks.query).toHaveBeenLastCalledWith(
      expect.stringContaining("DELETE FROM users"),
      ["user-1"],
    );
    expect(result).toEqual({ id: "user-1" });
  });

  it("blocks deleting your own account", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/admin.js")).default;
    mocks.query.mockResolvedValue({ rows: [] });
    await registerRoutes(app);
    mocks.query.mockReset();

    const deleteHandler = findHandler(
      handlers,
      "delete",
      "/admin/users/:id",
    ) as (req: any, reply: any) => Promise<any>;

    const reply = createReply();
    await deleteHandler({ params: { id: "self" }, user: { id: "self" } }, reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ error: "You cannot delete your own account" });
  });

  it("returns 404 when deleting a missing user", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/admin.js")).default;
    mocks.query.mockResolvedValue({ rows: [] });
    await registerRoutes(app);
    mocks.query.mockReset();

    const deleteHandler = findHandler(
      handlers,
      "delete",
      "/admin/users/:id",
    ) as (req: any, reply: any) => Promise<any>;

    mocks.query.mockResolvedValueOnce({ rows: [] });

    const reply = createReply();
    await deleteHandler({ params: { id: "ghost" }, user: { id: "admin" } }, reply);

    expect(reply.statusCode).toBe(404);
    expect(reply.payload).toEqual({ error: "User not found" });
  });

  it("blocks deletion of the last admin user", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/admin.js")).default;
    mocks.query.mockResolvedValue({ rows: [] });
    await registerRoutes(app);
    mocks.query.mockReset();
    mocks.query.mockResolvedValue({ rows: [] });

    const deleteHandler = findHandler(
      handlers,
      "delete",
      "/admin/users/:id",
    ) as (req: any, reply: any) => Promise<any>;

    mocks.query
      .mockResolvedValueOnce({ rows: [{ role: "ADMIN" }] }) // target role
      .mockResolvedValueOnce({ rows: [{ count: "0" }] }); // remaining admins

    const reply = createReply();
    await deleteHandler({ params: { id: "admin-1" }, user: { id: "other" } }, reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ error: "Cannot delete the last admin" });
  });
});

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
