import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FastifyInstance } from "fastify"

const queryMock = vi.hoisted(() => vi.fn())
const poolConnectMock = vi.hoisted(() => vi.fn())

vi.mock("../../src/db.js", () => ({
  query: queryMock,
  pool: {
    connect: poolConnectMock,
  },
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

describe("Admin analytics integration", () => {
  let app: FastifyInstance | null = null

  beforeEach(() => {
    queryMock.mockReset()
    poolConnectMock.mockReset()
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

  function baseQueryHandler(sql: string) {
    if (/ALTER TABLE users/i.test(sql) || /CREATE TABLE/i.test(sql) || /CREATE INDEX/i.test(sql)) {
      return { rows: [], rowCount: 0 }
    }
    if (sql.includes("to_regclass")) {
      return { rows: [{ table_exists: false }], rowCount: 1 }
    }
    throw new Error(`Unexpected query:\n${sql}`)
  }

  const createApp = () => import("../../src/server.js").then(({ buildServer }) => buildServer())

  it("returns aggregated analytics for admins", async () => {
    const analyticsRows = {
      totalEvents: 9,
      totalUsers: 24,
      activeEvents: 4,
      upcomingEvents: 5,
    }

    queryMock.mockImplementation(async (text: string | { text: string }) => {
      const sql = typeof text === "string" ? text : text.text
      return baseQueryHandler(sql)
    })

    const clientQueryMock = vi.fn(async (sql: string) => {
      if (/unnest\(categories\)/i.test(sql)) {
        return {
          rows: [
            { category: "music", count: "4" },
            { category: "culture", count: "3" },
            { category: "tech", count: "2" },
          ],
          rowCount: 3,
        }
      }
      if (/FROM events/i.test(sql) && /starts_at <= NOW/i.test(sql)) {
        return { rows: [{ count: String(analyticsRows.activeEvents) }], rowCount: 1 }
      }
      if (/FROM events/i.test(sql) && /starts_at > NOW/i.test(sql)) {
        return { rows: [{ count: String(analyticsRows.upcomingEvents) }], rowCount: 1 }
      }
      if (/FROM events/i.test(sql) && !/WHERE/i.test(sql)) {
        return { rows: [{ count: String(analyticsRows.totalEvents) }], rowCount: 1 }
      }
      if (/FROM users/i.test(sql)) {
        return { rows: [{ count: String(analyticsRows.totalUsers) }], rowCount: 1 }
      }
      throw new Error(`Unexpected pool query:\n${sql}`)
    })

    const releaseMock = vi.fn()
    poolConnectMock.mockResolvedValue({
      query: clientQueryMock,
      release: releaseMock,
    })

    app = await createApp()
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/analytics",
      headers: { authorization: "Bearer token" },
    })

    expect(response.statusCode).toBe(200)
    expect(poolConnectMock).toHaveBeenCalledTimes(1)
    expect(clientQueryMock).toHaveBeenCalledTimes(5)
    expect(releaseMock).toHaveBeenCalledTimes(1)

    expect(response.json()).toEqual({
      totalEvents: analyticsRows.totalEvents,
      totalUsers: analyticsRows.totalUsers,
      activeEvents: analyticsRows.activeEvents,
      upcomingEvents: analyticsRows.upcomingEvents,
      categoriesDistribution: [
        { category: "music", count: 4 },
        { category: "culture", count: 3 },
        { category: "tech", count: 2 },
      ],
    })
  })
})

