import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { FastifyInstance } from "fastify"

const queryMock = vi.hoisted(() => vi.fn())
const cuidMock = vi.hoisted(() => vi.fn())

vi.mock("../../src/db.js", () => ({
  query: queryMock,
}))

vi.mock("../../src/utils.js", () => ({
  cuid: cuidMock,
  iso: (value: Date | string | number) => new Date(value).toISOString(),
}))

const authMocks = vi.hoisted(() => ({
  requireOrganizerOrAdmin: vi.fn(async (req: any) => {
    req.user = { id: "org-1", role: "ADMIN" }
  }),
  requireUser: vi.fn(async (req: any) => {
    req.user = { id: "org-1", role: "ADMIN" }
  }),
  requireAdmin: vi.fn(async (req: any) => {
    req.user = { id: "org-1", role: "ADMIN" }
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

describe("Expense management integration", () => {
  let app: FastifyInstance | null = null

  beforeEach(() => {
    queryMock.mockReset()
    cuidMock.mockReset()
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
    if (/CREATE TABLE/i.test(sql) || /CREATE INDEX/i.test(sql)) {
      return { rows: [], rowCount: 0 }
    }
    if (sql.includes("to_regclass('public.event_expenses')")) {
      return { rows: [{ table_exists: false }], rowCount: 1 }
    }
    if (/ALTER TABLE users/i.test(sql)) {
      return { rows: [], rowCount: 0 }
    }
    throw new Error(`Unexpected query:\n${sql}`)
  }

  function authorize() {
    return { authorization: "Bearer token" }
  }

  it("creates a new expense entry", async () => {
    cuidMock.mockReturnValueOnce("exp-1")
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT id, title, starts_at, venue_name FROM events WHERE id=\$1/.test(sql)) {
        expect(params).toEqual(["evt-1"])
        return {
          rows: [{ id: "evt-1", title: "Gala", starts_at: "2024-05-01T18:00:00.000Z", venue_name: "Main" }],
          rowCount: 1,
        }
      }
      if (/INSERT INTO event_expenses/.test(sql)) {
        expect(params).toEqual([
          "exp-1",
          "evt-1",
          "Lighting rig",
          "Production",
          "Light Co",
          3,
          4500,
          4200,
          "COMMITTED",
          "2024-04-25",
          "Includes setup fees",
        ])
        return { rows: [], rowCount: 1 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "POST",
      url: "/api/events/evt-1/expenses",
      headers: authorize(),
      payload: {
        label: "Lighting rig",
        category: "Production",
        vendor: "Light Co",
        quantity: "3",
        estimatedCost: "4500",
        actualCost: "4200",
        status: "COMMITTED",
        incurredOn: "2024-04-25",
        notes: "Includes setup fees",
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toEqual({ id: "exp-1" })
  })

  it("rejects expense creation when event is missing", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT id, title, starts_at, venue_name FROM events WHERE id=\$1/.test(sql)) {
        expect(params).toEqual(["evt-missing"])
        return { rows: [], rowCount: 0 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "POST",
      url: "/api/events/evt-missing/expenses",
      headers: authorize(),
      payload: {
        label: "Sound",
        category: "Production",
      },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ error: "Event not found" })
  })

  it("updates an expense line item", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT id, title, starts_at, venue_name FROM events WHERE id=\$1/.test(sql)) {
        return {
          rows: [{ id: "evt-2", title: "Summit", starts_at: "2024-09-10T09:00:00.000Z", venue_name: "Center" }],
          rowCount: 1,
        }
      }
      if (/UPDATE event_expenses/.test(sql)) {
        expect(params).toEqual([
          "exp-9",
          "evt-2",
          "AV package",
          "Production",
          "AV Corp",
          1,
          1200,
          1100,
          "PAID",
          "2024-08-20",
          "Final invoice",
        ])
        return { rows: [], rowCount: 1 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "PUT",
      url: "/api/events/evt-2/expenses/exp-9",
      headers: authorize(),
      payload: {
        label: "AV package",
        category: "Production",
        vendor: "AV Corp",
        quantity: "1",
        estimatedCost: "1200",
        actualCost: "1100",
        status: "PAID",
        incurredOn: "2024-08-20",
        notes: "Final invoice",
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id: "exp-9" })
  })

  it("returns 404 when updating a missing expense", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT id, title, starts_at, venue_name FROM events WHERE id=\$1/.test(sql)) {
        return {
          rows: [{ id: "evt-2", title: "Summit", starts_at: "2024-09-10T09:00:00.000Z", venue_name: "Center" }],
          rowCount: 1,
        }
      }
      if (/UPDATE event_expenses/.test(sql)) {
        return { rows: [], rowCount: 0 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "PUT",
      url: "/api/events/evt-2/expenses/exp-missing",
      headers: authorize(),
      payload: {
        label: "AV package",
        category: "Production",
        vendor: null,
        quantity: "1",
        estimatedCost: "1200",
        actualCost: "1100",
        status: "PAID",
      },
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ error: "Expense not found" })
  })

  it("deletes an expense line", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT id, title, starts_at, venue_name FROM events WHERE id=\$1/.test(sql)) {
        return {
          rows: [{ id: "evt-3", title: "Forum", starts_at: "2024-10-05T08:00:00.000Z", venue_name: "Auditorium" }],
          rowCount: 1,
        }
      }
      if (/DELETE FROM event_expenses WHERE id=\$1 AND event_id=\$2/.test(sql)) {
        expect(params).toEqual(["exp-4", "evt-3"])
        return { rows: [], rowCount: 1 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "DELETE",
      url: "/api/events/evt-3/expenses/exp-4",
      headers: authorize(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id: "exp-4" })
  })

  it("returns 404 when deleting an unknown expense", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT id, title, starts_at, venue_name FROM events WHERE id=\$1/.test(sql)) {
        return {
          rows: [{ id: "evt-3", title: "Forum", starts_at: "2024-10-05T08:00:00.000Z", venue_name: "Auditorium" }],
          rowCount: 1,
        }
      }
      if (/DELETE FROM event_expenses WHERE id=\$1 AND event_id=\$2/.test(sql)) {
        return { rows: [], rowCount: 0 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "DELETE",
      url: "/api/events/evt-3/expenses/exp-missing",
      headers: authorize(),
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ error: "Expense not found" })
  })
})
