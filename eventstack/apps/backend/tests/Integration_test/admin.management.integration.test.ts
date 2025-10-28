import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FastifyInstance } from "fastify"

const queryMock = vi.hoisted(() => vi.fn())

vi.mock("../../src/db.js", () => ({
  query: queryMock,
}))

const authMocks = vi.hoisted(() => ({
  requireOrganizerOrAdmin: vi.fn(async (req: any) => {
    req.user = { id: "admin-1", role: "ADMIN" }
  }),
  requireUser: vi.fn(async (req: any) => {
    req.user = { id: "admin-1", role: "ADMIN" }
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

describe("Admin management integration", () => {
  let app: FastifyInstance | null = null

  beforeEach(() => {
    queryMock.mockReset()
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

  function authorize(headers: Record<string, string> = {}) {
    return { authorization: "Bearer token", ...headers }
  }

  it("lists users filtered by role", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT id, email, role, COALESCE\(status/.test(sql)) {
        expect(params).toEqual(["ORGANIZER"])
        return {
          rows: [
            {
              id: "org-1",
              email: "organizer@example.com",
              role: "ORGANIZER",
              status: "ACTIVE",
              created_at: "2024-01-01T00:00:00.000Z",
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
      url: "/api/admin/users?role=organizer",
      headers: authorize(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        id: "org-1",
        email: "organizer@example.com",
        role: "ORGANIZER",
        status: "ACTIVE",
        created_at: "2024-01-01T00:00:00.000Z",
      },
    ])
  })

  it("updates user role when other admins remain", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT COUNT\(\*\) as count FROM users WHERE role='ADMIN' AND id <> \$1/.test(sql)) {
        expect(params).toEqual(["user-2"])
        return { rows: [{ count: "2" }], rowCount: 1 }
      }
      if (/SELECT role FROM users WHERE id=\$1/.test(sql)) {
        return { rows: [{ role: "ADMIN" }], rowCount: 1 }
      }
      if (/UPDATE users SET role=\$2 WHERE id=\$1/.test(sql)) {
        expect(params).toEqual(["user-2", "USER"])
        return { rows: [], rowCount: 1 }
      }
      if (/SELECT id, email, role, COALESCE\(status/.test(sql)) {
        return {
          rows: [
            {
              id: "user-2",
              email: "staff@example.com",
              role: "USER",
              status: "ACTIVE",
              created_at: "2023-12-12T00:00:00.000Z",
            },
          ],
          rowCount: 1,
        }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "PATCH",
      url: "/api/admin/users/user-2/role",
      headers: authorize(),
      payload: { role: "USER" },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id: "user-2", role: "USER" })
  })

  it("prevents demoting the last admin", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT COUNT\(\*\) as count FROM users WHERE role='ADMIN' AND id <> \$1/.test(sql)) {
        return { rows: [{ count: "0" }], rowCount: 1 }
      }
      if (/SELECT role FROM users WHERE id=\$1/.test(sql)) {
        return { rows: [{ role: "ADMIN" }], rowCount: 1 }
      }
      if (/UPDATE users SET role=\$2 WHERE id=\$1/.test(sql)) {
        throw new Error("should not update when last admin")
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "PATCH",
      url: "/api/admin/users/admin-2/role",
      headers: authorize(),
      payload: { role: "USER" },
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ error: "Cannot demote the last admin" })
  })

  it("updates user status", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/UPDATE users SET status=\$2 WHERE id=\$1/.test(sql)) {
        expect(params).toEqual(["org-1", "SUSPENDED"])
        return { rows: [], rowCount: 1 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "PATCH",
      url: "/api/admin/users/org-1/status",
      headers: authorize(),
      payload: { status: "SUSPENDED" },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id: "org-1", status: "SUSPENDED" })
  })

  it("prevents deleting own account", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }) => {
      const sql = typeof text === "string" ? text : text.text
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "DELETE",
      url: "/api/admin/users/admin-1",
      headers: authorize(),
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ error: "You cannot delete your own account" })
  })

  it("prevents deleting the last admin", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT role FROM users WHERE id=\$1/.test(sql)) {
        expect(params).toEqual(["admin-2"])
        return { rows: [{ role: "ADMIN" }], rowCount: 1 }
      }
      if (/SELECT COUNT\(\*\) as count FROM users WHERE role='ADMIN' AND id<>\$1/.test(sql)) {
        return { rows: [{ count: "0" }], rowCount: 1 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "DELETE",
      url: "/api/admin/users/admin-2",
      headers: authorize(),
    })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toEqual({ error: "Cannot delete the last admin" })
  })

  it("deletes a non-admin user", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT role FROM users WHERE id=\$1/.test(sql)) {
        expect(params).toEqual(["user-5"])
        return { rows: [{ role: "USER" }], rowCount: 1 }
      }
      if (/DELETE FROM users WHERE id=\$1/.test(sql)) {
        expect(params).toEqual(["user-5"])
        return { rows: [], rowCount: 1 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "DELETE",
      url: "/api/admin/users/user-5",
      headers: authorize({ "x-test": "delete" }),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id: "user-5" })
  })
})

