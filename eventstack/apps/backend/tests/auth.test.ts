import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    JWT_SECRET: "another-secret",
    CORS_ORIGINS: "http://localhost:5173",
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("auth index exports", () => {
  it("exposes expected helper functions", async () => {
    const auth = await import("../../src/auth.js");
    expect(typeof auth.hashPassword).toBe("function");
    expect(typeof auth.verifyPassword).toBe("function");
    expect(typeof auth.signJwt).toBe("function");
    expect(typeof auth.verifyJwt).toBe("function");
    expect(typeof auth.requireUser).toBe("function");
  });
});
