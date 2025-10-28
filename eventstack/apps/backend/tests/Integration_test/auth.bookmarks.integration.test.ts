import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FastifyInstance } from "fastify"

const queryMock = vi.hoisted(() => vi.fn())

vi.mock("../../src/db.js", () => ({
  query: queryMock,
}))

const hashPasswordMock = vi.hoisted(() => vi.fn(async (_password: string) => "hashed-password"))
const verifyPasswordMock = vi.hoisted(() => vi.fn(async () => true))
const signJwtMock = vi.hoisted(() => vi.fn(() => "signed-token"))

const authMocks = vi.hoisted(() => ({
  hashPassword: hashPasswordMock,
  verifyPassword: verifyPasswordMock,
  signJwt: signJwtMock,
  requireOrganizerOrAdmin: vi.fn(async (req: any) => {
    req.user = { id: "user-1", role: "ADMIN" }
  }),
  requireUser: vi.fn(async (req: any) => {
    req.user = { id: "user-1", email: "user@example.com", role: "USER" }
  }),
  requireAdmin: vi.fn(async (req: any) => {
    req.user = { id: "admin-1", role: "ADMIN" }
  }),
}))

vi.mock("../../src/auth.js", () => authMocks)

vi.mock("../../src/env.js", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 4000,
    DATABASE_URL: "postgresql://localhost/eventstack_test",
    JWT_SECRET: "integration-secret",
    CORS_ORIGINS: "http://localhost:5173",
    GEMINI_API_KEY: "fake-key",
  },
  corsOriginList: ["http://localhost:5173"],
}))

describe("Auth and bookmarks integration", () => {
  let app: FastifyInstance | null = null

  beforeEach(() => {
    queryMock.mockReset()
    hashPasswordMock.mockClear()
    verifyPasswordMock.mockClear()
    signJwtMock.mockClear()
    hashPasswordMock.mockImplementation(async (password: string) => `hashed-${password}`)
    verifyPasswordMock.mockImplementation(async () => true)
    signJwtMock.mockImplementation(() => "signed-token")
    authMocks.requireOrganizerOrAdmin.mockClear()
    authMocks.requireUser.mockClear()
    authMocks.requireAdmin.mockClear()
    ;(globalThis as any).fetch = vi.fn()
  })

  afterEach(async () => {
    if (app) {
      await app.close()
      app = null
    }
    ;(globalThis as any).fetch = undefined
  })

  const createApp = () => import("../../src/server.js").then(({ buildServer }) => buildServer())

  function baseQueryHandler(sql: string) {
    if (/ALTER TABLE users/i.test(sql)) {
      return { rows: [], rowCount: 0 }
    }
    if (/CREATE TABLE/i.test(sql) || /CREATE INDEX/i.test(sql)) {
      return { rows: [], rowCount: 0 }
    }
    if (sql.includes("to_regclass('public.event_expenses')")) {
      return { rows: [{ table_exists: false }], rowCount: 1 }
    }
    throw new Error(`Unexpected query:\n${sql}`)
  }

  it("registers a new user", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/INSERT INTO users/.test(sql)) {
        expect(params?.[1]).toBe("new@example.com")
        expect(hashPasswordMock).toHaveBeenCalledWith("secret123")
        return { rows: [], rowCount: 1 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "new@example.com", password: "secret123" },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.token).toBe("signed-token")
    expect(body.user).toMatchObject({ email: "new@example.com", role: "USER" })
  })

  it("prevents registering duplicate users", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }) => {
      const sql = typeof text === "string" ? text : text.text
      if (/INSERT INTO users/.test(sql)) {
        const err = new Error("duplicate")
        ;(err as any).code = "23505"
        throw err
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "exists@example.com", password: "password1" },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ error: "Email already in use" })
  })

  it("logs in hard-coded admin credentials", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }) => {
      return baseQueryHandler(typeof text === "string" ? text : text.text)
    })

    app = await createApp()
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "admin@gmail.com", password: "admin123" },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      token: "signed-token",
      user: { id: "admin-static", email: "admin@gmail.com", role: "ADMIN" },
    })
    expect(signJwtMock).toHaveBeenCalled()
    expect(verifyPasswordMock).not.toHaveBeenCalled()
  })

  it("logs in stored users when password matches", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT \* FROM users WHERE email=\$1/.test(sql)) {
        expect(params).toEqual(["member@example.com"])
        return {
          rows: [{ id: "user-77", email: "member@example.com", password_hash: "hashed", role: "USER" }],
          rowCount: 1,
        }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "member@example.com", password: "secretpw" },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      token: "signed-token",
      user: { id: "user-77", email: "member@example.com", role: "USER" },
    })
    expect(verifyPasswordMock).toHaveBeenCalledWith("secretpw", "hashed")
  })

  it("rejects invalid login attempts", async () => {
    verifyPasswordMock.mockResolvedValueOnce(false)

    queryMock.mockImplementation(async (text: string | { text: string }) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT \* FROM users WHERE email=\$1/.test(sql)) {
        return {
          rows: [{ id: "user-2", email: "user@example.com", password_hash: "hash", role: "USER" }],
          rowCount: 1,
        }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "user@example.com", password: "badpass" },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual({ error: "Invalid credentials" })
  })

  it("returns current user details", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }) => {
      return baseQueryHandler(typeof text === "string" ? text : text.text)
    })

    app = await createApp()
    const response = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: "Bearer token" },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      user: { id: "user-1", email: "user@example.com", role: "USER" },
    })
  })

  it("lists bookmarks for the current user", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT b.event_id as id/.test(sql)) {
        expect(params).toEqual(["user-1"])
        return {
          rows: [
            {
              id: "evt-1",
              title: "Jazz Night",
              summary: "Live",
              starts_at: "2024-05-01T18:00:00.000Z",
              ends_at: "2024-05-01T21:00:00.000Z",
              cover_url: "/uploads/jazz.jpg",
              venue_name: "Blue Hall",
            },
          ],
          rowCount: 1,
        }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "GET",
      url: "/api/me/bookmarks",
      headers: { authorization: "Bearer token" },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        id: "evt-1",
        title: "Jazz Night",
        summary: "Live",
        startsAt: "2024-05-01T18:00:00.000Z",
        endsAt: "2024-05-01T21:00:00.000Z",
        coverUrl: "/uploads/jazz.jpg",
        venue: { id: undefined, name: "Blue Hall" },
      },
    ])
  })

  it("adds a bookmark without error", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/INSERT INTO bookmarks/.test(sql)) {
        expect(params?.[1]).toBe("user-1")
        expect(params?.[2]).toBe("evt-99")
        return { rows: [], rowCount: 1 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "POST",
      url: "/api/me/bookmarks",
      headers: { authorization: "Bearer token" },
      payload: { eventId: "evt-99" },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual({ ok: true })
  })

  it("removes a bookmark by id", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/DELETE FROM bookmarks WHERE user_id=\$1 AND event_id=\$2/.test(sql)) {
        expect(params).toEqual(["user-1", "evt-77"])
        return { rows: [], rowCount: 1 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "DELETE",
      url: "/api/me/bookmarks/evt-77",
      headers: { authorization: "Bearer token" },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ ok: true })
  })
})
