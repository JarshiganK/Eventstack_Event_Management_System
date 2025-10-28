import { beforeEach, describe, expect, it, vi } from "vitest";

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
  env: {
    NODE_ENV: "test",
    PORT: 4000,
    DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    JWT_SECRET: "test-secret",
    CORS_ORIGINS: "http://localhost:5173",
    GEMINI_API_KEY: undefined,
  },
}));

let fsModule: Awaited<typeof import("fs")>;

beforeEach(async () => {
  fsModule = vi.mocked(await import("fs"));
  fsModule.existsSync.mockReset();
  fsModule.mkdirSync.mockReset();
  fsModule.existsSync.mockReturnValue(true);

  fastifyInstance.register.mockClear();
  fastifyInstance.get.mockClear();
  Object.values(routeMocks).forEach((mock) => {
    mock.mockReset();
    mock.mockResolvedValue(undefined);
  });
});

describe("buildServer", () => {
  it("creates a Fastify instance and registers plugins", async () => {
    const { buildServer } = await import("../../src/server.js");

    const app = await buildServer();

    expect(app).toBe(fastifyInstance);
    const calls = fastifyInstance.register.mock.calls;
    expect(calls).toHaveLength(11);
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

  it("creates the uploads directory when missing", async () => {
    fsModule.existsSync.mockReturnValueOnce(false);
    const { buildServer } = await import("../../src/server.js");

    await buildServer();

    expect(fsModule.mkdirSync).toHaveBeenCalledWith(
      expect.stringMatching(/apps[\\/]+backend[\\/]+uploads$/),
      { recursive: true },
    );
  });

  it("applies the CORS origin predicate", async () => {
    const { buildServer } = await import("../../src/server.js");

    await buildServer();

    const corsCall = fastifyInstance.register.mock.calls[0];
    const options = corsCall?.[1] as {
      origin: (origin: string | undefined, cb: (err: null, allowed: boolean) => void) => void;
    };
    const cb = vi.fn<void, [null, boolean]>();

    options.origin(undefined, cb);
    options.origin("http://localhost:5173", cb);
    options.origin("https://example.com", cb);

    expect(cb).toHaveBeenNthCalledWith(1, null, true);
    expect(cb).toHaveBeenNthCalledWith(2, null, true);
    expect(cb).toHaveBeenNthCalledWith(3, null, false);
  });
});
