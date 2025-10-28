import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: "test",
    DATABASE_URL: "postgres://user:pass@localhost:5432/db",
    JWT_SECRET: "super-secret",
    CORS_ORIGINS: "http://localhost:5173",
  };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe("auth/jwt", () => {
  it("signs and verifies tokens with expected payload", async () => {
    const { signJwt, verifyJwt } = await import("../../../src/auth/jwt.js");
    const token = signJwt({ id: "abc", email: "user@email.test", role: "ADMIN" });
    const payload = verifyJwt(token);
    expect(payload).toMatchObject({
      sub: "abc",
      email: "user@email.test",
      role: "ADMIN",
    });
  });

  it("returns null for invalid tokens", async () => {
    const { verifyJwt } = await import("../../../src/auth/jwt.js");
    expect(verifyJwt("invalid.token.value")).toBeNull();
  });
});
