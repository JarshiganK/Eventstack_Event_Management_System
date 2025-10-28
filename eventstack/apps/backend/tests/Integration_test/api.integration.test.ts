import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FastifyInstance } from "fastify"

const queryMock = vi.hoisted(() => vi.fn())

vi.mock("../../src/db.js", () => ({
  query: queryMock,
}))

const authMocks = vi.hoisted(() => ({
  requireOrganizerOrAdmin: vi.fn(async (req: any) => {
    req.user = { id: "user-1", role: "ADMIN" }
  }),
  requireUser: vi.fn(async (req: any) => {
    req.user = { id: "user-1", role: "ADMIN" }
  }),
  requireAdmin: vi.fn(async (req: any) => {
    req.user = { id: "user-1", role: "ADMIN" }
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

describe("API integration", () => {
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

  function baseQueryHandler(sql: string) {
    if (/CREATE TABLE/i.test(sql) || /CREATE INDEX/i.test(sql) || /ALTER TABLE/i.test(sql)) {
      return { rows: [], rowCount: 0 }
    }
    if (sql.includes("to_regclass")) {
      return { rows: [{ table_exists: false }], rowCount: 1 }
    }
    throw new Error(`Unexpected query:\n${sql}`)
  }

  const createApp = () => import("../../src/server.js").then(({ buildServer }) => buildServer())

  it("returns normalized event listings", async () => {
    const eventRow = {
      id: "evt-1",
      title: "Concert Night",
      summary: "Live music evening",
      starts_at: "2024-05-01T18:00:00.000Z",
      ends_at: "2024-05-01T21:00:00.000Z",
      categories: ["music"],
      cover_url: "/uploads/cover.jpg",
      venue_name: "Blue Hall",
    }

    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/CREATE TABLE|CREATE INDEX|ALTER TABLE|to_regclass/.test(sql)) {
        return baseQueryHandler(sql)
      }
      if (sql.includes("FROM events e") && !sql.includes("WHERE e.id=$1")) {
        expect(params).toEqual([])
        return { rows: [eventRow], rowCount: 1 }
      }
      throw new Error(`Unexpected query:\n${sql}`)
    })

    app = await createApp()
    const response = await app.inject({ method: "GET", url: "/api/events" })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body).toEqual([
      {
        id: "evt-1",
        title: "Concert Night",
        summary: "Live music evening",
        startsAt: "2024-05-01T18:00:00.000Z",
        endsAt: "2024-05-01T21:00:00.000Z",
        categories: ["music"],
        coverUrl: "/uploads/cover.jpg",
        venue: { name: "Blue Hall" },
      },
    ])
  })

  it("searches events using the searchable index", async () => {
    const searchRow = {
      id: "evt-2",
      title: "Comedy Fest",
      summary: "Stand-up gala",
      starts_at: "2024-06-10T19:00:00.000Z",
      ends_at: "2024-06-10T22:00:00.000Z",
      categories: ["comedy"],
      cover_url: null,
      venue_name: "Main Stage",
    }

    queryMock.mockImplementation(async (text: string | { text: string }) => {
      const sql = typeof text === "string" ? text : text.text
      if (/CREATE TABLE|CREATE INDEX|ALTER TABLE|to_regclass/.test(sql)) {
        return baseQueryHandler(sql)
      }
      if (sql.includes("FROM events e") && sql.includes("WHERE")) {
        return { rows: [searchRow], rowCount: 1 }
      }
      throw new Error(`Unexpected query:\n${sql}`)
    })

    app = await createApp()
    const response = await app.inject({ method: "GET", url: "/api/search?query=Comedy" })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      results: [
        {
          id: "evt-2",
          title: "Comedy Fest",
          summary: "Stand-up gala",
          startsAt: "2024-06-10T19:00:00.000Z",
          endsAt: "2024-06-10T22:00:00.000Z",
          categories: ["comedy"],
          coverUrl: undefined,
          venue: { id: undefined, name: "Main Stage" },
        },
      ],
    })
  })

  it("returns expense summaries for an event", async () => {
    let toRegclassCalls = 0
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/CREATE TABLE|CREATE INDEX|ALTER TABLE/.test(sql)) {
        return { rows: [], rowCount: 0 }
      }
      if (sql.includes("to_regclass")) {
        toRegclassCalls += 1
        return { rows: [{ table_exists: toRegclassCalls > 1 }], rowCount: 1 }
      }
      if (sql.startsWith("SELECT id, title")) {
        return {
          rows: [
            {
              id: params?.[0],
              title: "Gala Night",
              starts_at: "2024-05-01T18:00:00.000Z",
              venue_name: "Main Hall",
            },
          ],
          rowCount: 1,
        }
      }
      if (sql.includes("FROM event_expenses")) {
        return {
          rows: [
            {
              id: "exp-1",
              event_id: params?.[0],
              label: "Sound system",
              category: "Logistics",
              vendor: "Acme Audio",
              quantity: 2,
              estimated_cost: 2000,
              actual_cost: 2500,
              status: "PAID",
              incurred_on: "2024-04-01",
              notes: "Deposit paid",
              created_at: "2024-03-01T10:00:00.000Z",
              updated_at: "2024-03-02T10:00:00.000Z",
            },
          ],
          rowCount: 1,
        }
      }
      throw new Error(`Unexpected query:\n${sql}`)
    })

    app = await createApp()
    const response = await app.inject({
      method: "GET",
      url: "/api/events/evt-1/expenses",
      headers: { authorization: "Bearer token" },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.event.title).toBe("Gala Night")
    expect(body.summary).toEqual(
      expect.objectContaining({
        plannedTotal: 2000,
        actualTotal: 2500,
        variance: 500,
        itemCount: 1,
      }),
    )
    expect(body.items).toHaveLength(1)
    expect(body.items[0]).toEqual(
      expect.objectContaining({
        label: "Sound system",
        category: "Logistics",
        actualCost: 2500,
      }),
    )
  })

  it("proxies questions to the budget bot endpoint", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }) => {
      const sql = typeof text === "string" ? text : text.text
      if (/CREATE TABLE|CREATE INDEX|ALTER TABLE|to_regclass/.test(sql)) {
        return baseQueryHandler(sql)
      }
      throw new Error(`Unexpected query:\n${sql}`)
    })

    const fetchMock = vi.mocked(globalThis.fetch as unknown as vi.Mock)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Budget outlook is healthy." }] } }],
      }),
      text: async () => "",
    } as any)

    app = await createApp()
    const response = await app.inject({
      method: "POST",
      url: "/api/events/evt-5/budget-bot",
      headers: { authorization: "Bearer token" },
      payload: {
        prompt: "Summarise risk",
        context: "Event snapshot",
        history: [{ role: "user", content: "Hello" }],
      },
    })

    expect(response.statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(response.json()).toEqual({ message: "Budget outlook is healthy." })
  })
})
