import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  cuid: vi.fn(),
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  signJwt: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("../../src/db.js", () => ({
  query: mocks.query,
}));

vi.mock("../../src/utils.js", () => ({
  cuid: mocks.cuid,
}));

vi.mock("../../src/auth.js", () => ({
  hashPassword: mocks.hashPassword,
  verifyPassword: mocks.verifyPassword,
  signJwt: mocks.signJwt,
  requireUser: mocks.requireUser,
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
    send(this: any, value: unknown) {
      this.payload = value;
      this.sent = true;
      return this;
    },
  };
}

describe("routes/auth", () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.cuid.mockReset();
    mocks.hashPassword.mockReset();
    mocks.verifyPassword.mockReset();
    mocks.signJwt.mockReset();
    mocks.requireUser.mockReset();
  });

  it("registers auth endpoints", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/auth.js")).default;

    await registerRoutes(app);

    expect(handlers.post).toHaveBeenCalledWith(
      "/auth/register",
      expect.any(Function),
    );
    expect(handlers.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function),
    );
    expect(handlers.get).toHaveBeenCalledWith(
      "/auth/me",
      { preHandler: mocks.requireUser },
      expect.any(Function),
    );
  });

  it("registers new users and returns token", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/auth.js")).default;
    await registerRoutes(app);

    const registerCall = handlers.post.mock.calls.find(
      ([path]) => path === "/auth/register",
    );
    expect(registerCall).toBeDefined();
    const handler = registerCall?.[1] as (req: any, reply: any) => Promise<any>;

    mocks.hashPassword.mockResolvedValue("hashed");
    mocks.signJwt.mockReturnValue("jwt-token");
    mocks.query.mockResolvedValueOnce({});
    mocks.cuid.mockReturnValue("user-123");

    const result = await handler(
      {
        body: { email: "user@test.dev", password: "secret123", role: "organizer" },
      },
      createReply(),
    );

    expect(mocks.hashPassword).toHaveBeenCalledWith("secret123");
    expect(mocks.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO users"),
      expect.arrayContaining(["user-123", "user@test.dev", "hashed", "ORGANIZER"]),
    );
    expect(result).toEqual({
      token: "jwt-token",
      user: { id: "user-123", email: "user@test.dev", role: "ORGANIZER" },
    });
  });

  it("rejects invalid registration payloads", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/auth.js")).default;
    await registerRoutes(app);

    const registerCall = handlers.post.mock.calls.find(
      ([path]) => path === "/auth/register",
    );
    const handler = registerCall?.[1] as (req: any, reply: any) => Promise<any>;

    const reply = createReply();
    await handler({ body: { email: "not-an-email", password: "123" } }, reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toMatchObject({ error: expect.any(String) });
  });

  it("handles duplicate registration errors", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/auth.js")).default;
    await registerRoutes(app);

    const registerCall = handlers.post.mock.calls.find(
      ([path]) => path === "/auth/register",
    );
    const handler = registerCall?.[1] as (req: any, reply: any) => Promise<any>;

    mocks.hashPassword.mockResolvedValue("hashed");
    mocks.cuid.mockReturnValue("user-235");
    mocks.query.mockRejectedValueOnce({ code: "23505" });

    const reply = createReply();
    await handler(
      { body: { email: "user@test.dev", password: "secret123" } },
      reply,
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual({ error: "Email already in use" });
  });

  it("returns 500 for unexpected registration failures", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/auth.js")).default;
    await registerRoutes(app);

    const registerCall = handlers.post.mock.calls.find(
      ([path]) => path === "/auth/register",
    );
    const handler = registerCall?.[1] as (req: any, reply: any) => Promise<any>;

    mocks.hashPassword.mockResolvedValue("hashed");
    mocks.cuid.mockReturnValue("user-901");
    mocks.query.mockRejectedValueOnce(new Error("boom"));

    const reply = createReply();
    await handler(
      { body: { email: "user@test.dev", password: "secret123" } },
      reply,
    );

    expect(reply.statusCode).toBe(500);
    expect(reply.payload).toEqual({ error: "Unable to register user" });
  });

  it("authenticates existing users via database", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/auth.js")).default;
    await registerRoutes(app);

    const loginCall = handlers.post.mock.calls.find(
      ([path]) => path === "/auth/login",
    );
    const handler = loginCall?.[1] as (req: any, reply: any) => Promise<any>;

    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: "u1",
          email: "user@test.dev",
          password_hash: "hashed",
          role: "USER",
        },
      ],
    });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.signJwt.mockReturnValue("jwt-user");

    const response = await handler(
      { body: { email: "user@test.dev", password: "secret123" } },
      createReply(),
    );

    expect(mocks.verifyPassword).toHaveBeenCalledWith("secret123", "hashed");
    expect(response).toEqual({
      token: "jwt-user",
      user: { id: "u1", email: "user@test.dev", role: "USER" },
    });
  });

  it("allows hard-coded admin logins", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/auth.js")).default;
    await registerRoutes(app);

    const loginCall = handlers.post.mock.calls.find(
      ([path]) => path === "/auth/login",
    );
    const handler = loginCall?.[1] as (req: any) => Promise<any>;

    mocks.signJwt.mockReturnValue("admin-token");

    const response = await handler({
      body: { email: "admin@gmail.com", password: "admin123" },
    });

    expect(response).toEqual({
      token: "admin-token",
      user: { id: "admin-static", email: "admin@gmail.com", role: "ADMIN" },
    });
  });

  it("returns 401 when password check fails", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/auth.js")).default;
    await registerRoutes(app);

    const loginCall = handlers.post.mock.calls.find(
      ([path]) => path === "/auth/login",
    );
    const handler = loginCall?.[1] as (req: any, reply: any) => Promise<any>;

    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: "u1",
          email: "user@test.dev",
          password_hash: "hashed",
          role: "USER",
        },
      ],
    });
    mocks.verifyPassword.mockResolvedValue(false);

    const reply = createReply();
    await handler({ body: { email: "user@test.dev", password: "badpwd" } }, reply);

    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toEqual({ error: "Invalid credentials" });
  });

  it("returns 401 when user record is missing", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/auth.js")).default;
    await registerRoutes(app);

    const loginCall = handlers.post.mock.calls.find(
      ([path]) => path === "/auth/login",
    );
    const handler = loginCall?.[1] as (req: any, reply: any) => Promise<any>;

    mocks.query.mockResolvedValueOnce({ rows: [] });

    const reply = createReply();
    await handler({ body: { email: "ghost@test.dev", password: "secret123" } }, reply);

    expect(reply.statusCode).toBe(401);
    expect(reply.payload).toEqual({ error: "Invalid credentials" });
  });

  it("returns current user on /auth/me", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../src/routes/auth.js")).default;
    await registerRoutes(app);

    const meCall = handlers.get.mock.calls.find(
      ([path]) => path === "/auth/me",
    );
    const handler = meCall?.[2] as (req: any) => Promise<any>;

    const result = await handler({ user: { id: "u1", email: "user@test.dev" } });
    expect(result).toEqual({ user: { id: "u1", email: "user@test.dev" } });
  });
});
