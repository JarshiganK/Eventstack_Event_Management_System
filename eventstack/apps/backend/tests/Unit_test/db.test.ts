import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPool = vi.hoisted(() => {
  const query = vi.fn();
  const instance = { query };
  const Factory = vi.fn(function PoolMock() {
    return instance;
  });
  return { instance, Factory };
});

vi.mock("pg", () => ({
  Pool: mockPool.Factory,
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  mockPool.Factory.mockClear();
  mockPool.instance.query.mockReset();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    JWT_SECRET: "db-secret",
    CORS_ORIGINS: "http://localhost:5173",
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("db", () => {
  it("creates a shared pool and proxies queries", async () => {
    const { pool, query } = await import("../../src/db.js");
    expect(pool).toBe(mockPool.instance as any);
    const result = { rows: [], rowCount: 0 };
    mockPool.instance.query.mockResolvedValue(result);

    const response = await query("SELECT 1", ["a"]);

    expect(mockPool.Factory).toHaveBeenCalledWith({
      connectionString: "postgres://user:pass@localhost:5432/db",
      ssl: undefined,
    });
    expect(mockPool.instance.query).toHaveBeenCalledWith("SELECT 1", ["a"]);
    expect(response).toEqual(result);
  });
});
