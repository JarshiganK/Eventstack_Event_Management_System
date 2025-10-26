import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    PORT: "5050",
    DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    JWT_SECRET: "env-secret",
    CORS_ORIGINS: "http://localhost:5173,https://example.com",
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("env", () => {
  it("parses environment variables with defaults", async () => {
    const { env, corsOriginList } = await import("../../src/env.js");
    expect(env.PORT).toBe(5050);
    expect(env.NODE_ENV).toBe("test");
    expect(corsOriginList).toEqual([
      "http://localhost:5173",
      "https://example.com",
    ]);
  });
});
