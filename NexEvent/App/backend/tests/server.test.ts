import { describe, expect, it, vi } from "vitest";

const fastifyInstance = vi.hoisted(() => {
  return {
    register: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    log: { error: vi.fn() },
  };
});

const routeMocks = vi.hoisted(() => ({
  auth: vi.fn(),
  events: vi.fn(),
  bookmarks: vi.fn(),
  uploads: vi.fn(),
  search: vi.fn(),
  admin: vi.fn(),
}));

vi.mock("fastify", () => ({
  default: vi.fn(() => fastifyInstance),
}));

vi.mock("@fastify/cors", () => ({
  default: vi.fn(),
}));

vi.mock("@fastify/multipart", () => ({
  default: vi.fn(),
}));

vi.mock("@fastify/static", () => ({
  default: vi.fn(),
}));

vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

vi.mock("../../src/routes/auth.js", () => ({
  __esModule: true,
  default: routeMocks.auth,
}));
vi.mock("../../src/routes/events.js", () => ({
  __esModule: true,
  default: routeMocks.events,
}));
vi.mock("../../src/routes/bookmarks.js", () => ({
  __esModule: true,
  default: routeMocks.bookmarks,
}));
vi.mock("../../src/routes/uploads.js", () => ({
  __esModule: true,
  default: routeMocks.uploads,
}));
vi.mock("../../src/routes/search.js", () => ({
  __esModule: true,
  default: routeMocks.search,
}));
vi.mock("../../src/routes/admin.js", () => ({
  __esModule: true,
  default: routeMocks.admin,
}));

vi.mock("../../src/env.js", () => ({
  corsOriginList: ["http://localhost:5173"],
}));

describe("buildServer", () => {
  it("creates a Fastify instance and registers plugins", async () => {
    Object.values(routeMocks).forEach((mock) => mock.mockResolvedValue(undefined));
    const { buildServer } = await import("../../src/server.js");

    const app = await buildServer();

    expect(app).toBe(fastifyInstance);
    const calls = fastifyInstance.register.mock.calls;
    expect(calls).toHaveLength(9);
    calls.slice(0, 3).forEach(([plugin]) => {
      expect(typeof plugin).toBe("function");
    });
    calls.slice(3).forEach(([plugin, options]) => {
      expect(typeof plugin).toBe("function");
      expect(options).toEqual({ prefix: "/api" });
    });
    expect(fastifyInstance.get).toHaveBeenCalledWith(
      "/api/health",
      expect.any(Function),
    );
  });
});
