import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    verifyJwt: vi.fn(),
    query: vi.fn(),
  };
});

vi.mock("../../src/auth/jwt.js", () => ({
  verifyJwt: mocks.verifyJwt,
}));

vi.mock("../../src/db.js", () => ({
  query: mocks.query,
}));

function createReply() {
  return {
    statusCode: undefined as number | undefined,
    payload: undefined as unknown,
    sent: false,
    code(this: any, status: number) {
      this.statusCode = status;
      return this;
    },
    send(this: any, payload: unknown) {
      this.payload = payload;
      this.sent = true;
      return this;
    },
  };
}

beforeEach(() => {
  mocks.verifyJwt.mockReset();
  mocks.query.mockReset();
});

describe("auth/middleware", () => {
  it("attaches user when token and record are valid", async () => {
    const req: any = { headers: { authorization: "Bearer token" } };
    const reply = createReply();
    mocks.verifyJwt.mockReturnValue({ sub: "user-1" });
    mocks.query.mockResolvedValue({
      rows: [{ id: "user-1", email: "hello@test.dev", role: "USER" }],
      rowCount: 1,
    });
    const { requireUser } = await import("../../src/auth/middleware.js");

    await requireUser(req, reply as any);

    expect(reply.sent).toBe(false);
    expect(req.user).toEqual({ id: "user-1", email: "hello@test.dev", role: "USER" });
    expect(mocks.query).toHaveBeenCalledWith(
      "SELECT id, email, role FROM users WHERE id=$1",
      ["user-1"]
    );
  });

  it("sends 401 when token verification fails", async () => {
    const req: any = { headers: {} };
    const reply = createReply();
    mocks.verifyJwt.mockReturnValue(null);
    const { requireUser } = await import("../../src/auth/middleware.js");

    await requireUser(req, reply as any);

    expect(reply.sent).toBe(true);
    expect(reply.statusCode).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("blocks non-admin users in requireAdmin", async () => {
    const req: any = { headers: { authorization: "Bearer token" } };
    const reply = createReply();
    mocks.verifyJwt.mockReturnValue({ sub: "user-2" });
    mocks.query.mockResolvedValue({
      rows: [{ id: "user-2", email: "user@test.dev", role: "user" }],
      rowCount: 1,
    });
    const { requireAdmin } = await import("../../src/auth/middleware.js");

    await requireAdmin(req, reply as any);

    expect(reply.sent).toBe(true);
    expect(reply.statusCode).toBe(403);
  });

  it("sends 401 when user record is missing", async () => {
    const req: any = { headers: { authorization: "Bearer token" } };
    const reply = createReply();
    mocks.verifyJwt.mockReturnValue({ sub: "ghost" });
    mocks.query.mockResolvedValue({ rows: [] });
    const { requireUser } = await import("../../src/auth/middleware.js");

    await requireUser(req, reply as any);

    expect(reply.sent).toBe(true);
    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toEqual({ error: "Unauthorized" });
  });

  it("allows admin users to proceed", async () => {
    const req: any = { headers: { authorization: "Bearer token" } };
    const reply = createReply();
    mocks.verifyJwt.mockReturnValue({ sub: "admin-1" });
    mocks.query.mockResolvedValue({
      rows: [{ id: "admin-1", email: "admin@test.dev", role: "ADMIN" }],
    });
    const { requireAdmin } = await import("../../src/auth/middleware.js");

    await requireAdmin(req, reply as any);

    expect(reply.sent).toBe(false);
    expect(req.user).toEqual({ id: "admin-1", email: "admin@test.dev", role: "ADMIN" });
  });

  it("returns early when requireUser already sent a response", async () => {
    const req: any = { headers: {} };
    const reply = createReply();
    mocks.verifyJwt.mockReturnValue(null);
    const { requireAdmin } = await import("../../src/auth/middleware.js");

    await requireAdmin(req, reply as any);

    expect(reply.statusCode).toBe(401);
    expect(reply.sent).toBe(true);
  });

  it("allows organizer users in requireOrganizerOrAdmin", async () => {
    const req: any = { headers: { authorization: "Bearer token" } };
    const reply = createReply();
    mocks.verifyJwt.mockReturnValue({ sub: "org-1" });
    mocks.query.mockResolvedValue({
      rows: [{ id: "org-1", email: "org@test.dev", role: "organizer" }],
    });
    const { requireOrganizerOrAdmin } = await import("../../src/auth/middleware.js");

    await requireOrganizerOrAdmin(req, reply as any);

    expect(reply.sent).toBe(false);
    expect(req.user).toEqual({ id: "org-1", email: "org@test.dev", role: "organizer" });
  });

  it("blocks non-privileged users in requireOrganizerOrAdmin", async () => {
    const req: any = { headers: { authorization: "Bearer token" } };
    const reply = createReply();
    mocks.verifyJwt.mockReturnValue({ sub: "user-3" });
    mocks.query.mockResolvedValue({
      rows: [{ id: "user-3", email: "user@test.dev", role: "user" }],
    });
    const { requireOrganizerOrAdmin } = await import("../../src/auth/middleware.js");

    await requireOrganizerOrAdmin(req, reply as any);

    expect(reply.sent).toBe(true);
    expect(reply.statusCode).toBe(403);
  });
});
