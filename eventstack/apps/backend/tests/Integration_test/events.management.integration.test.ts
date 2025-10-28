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

describe("Event management integration", () => {
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

  it("filters event listings by date range and category", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT e\.\*,\s+\(SELECT url FROM event_images/.test(sql)) {
        expect(params).toEqual(["2024-05-01", "2024-05-31", "music"])
        return {
          rows: [
            {
              id: "evt-1",
              title: "Spring Concert",
              summary: "Music gala",
              starts_at: "2024-05-10T18:00:00.000Z",
              ends_at: "2024-05-10T21:00:00.000Z",
              categories: ["music"],
              cover_url: "/uploads/cover.jpg",
              venue_name: "Main Hall",
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
      url: "/api/events?from=2024-05-01&to=2024-05-31&category=music",
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual([
      {
        id: "evt-1",
        title: "Spring Concert",
        summary: "Music gala",
        startsAt: "2024-05-10T18:00:00.000Z",
        endsAt: "2024-05-10T21:00:00.000Z",
        categories: ["music"],
        coverUrl: "/uploads/cover.jpg",
        venue: { name: "Main Hall" },
      },
    ])
  })

  it("fetches event details with image gallery", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT e\.\* , e\.cover_url FROM/.test(sql)) {
        expect(params).toEqual(["evt-2"])
        return {
          rows: [
            {
              id: "evt-2",
              title: "Comedy Night",
              summary: "Laughs guaranteed",
              starts_at: "2024-06-01T20:00:00.000Z",
              ends_at: "2024-06-01T22:00:00.000Z",
              categories: ["comedy"],
              cover_url: "/uploads/main.jpg",
              venue_name: "Stage One",
            },
          ],
          rowCount: 1,
        }
      }
      if (/SELECT \* FROM event_images WHERE event_id=\$1/.test(sql)) {
        expect(params).toEqual(["evt-2"])
        return {
          rows: [
            { id: "img-1", event_id: "evt-2", url: "/uploads/main.jpg", ord: 0 },
            { id: "img-2", event_id: "evt-2", url: "/uploads/second.jpg", ord: 1 },
          ],
          rowCount: 2,
        }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "GET",
      url: "/api/events/evt-2",
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      id: "evt-2",
      title: "Comedy Night",
      summary: "Laughs guaranteed",
      startsAt: "2024-06-01T20:00:00.000Z",
      endsAt: "2024-06-01T22:00:00.000Z",
      categories: ["comedy"],
      images: [
        { id: "img-1", event_id: "evt-2", url: "/uploads/main.jpg", ord: 0 },
        { id: "img-2", event_id: "evt-2", url: "/uploads/second.jpg", ord: 1 },
      ],
      venue: { name: "Stage One" },
    })
  })

  it("returns 404 when event details missing", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT e\.\* , e\.cover_url FROM/.test(sql)) {
        expect(params).toEqual(["evt-missing"])
        return { rows: [], rowCount: 0 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "GET",
      url: "/api/events/evt-missing",
    })

    expect(response.statusCode).toBe(404)
    expect(response.json()).toEqual({ error: "Not found" })
  })

  it("creates a new event via admin route", async () => {
    cuidMock.mockReturnValueOnce("evt-new")

    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/INSERT INTO events/.test(sql)) {
        expect(params).toEqual([
          "evt-new",
          "Art Expo",
          "Modern art showcase",
          "2024-07-01T10:00:00.000Z",
          "2024-07-01T18:00:00.000Z",
          "Gallery One",
          ["art", "featured"],
          "art expo modern art showcase gallery one art featured",
        ])
        return { rows: [], rowCount: 1 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/events",
      headers: authorize(),
      payload: {
        title: "Art Expo",
        summary: "Modern art showcase",
        startsAt: "2024-07-01T10:00:00.000Z",
        endsAt: "2024-07-01T18:00:00.000Z",
        venueName: "Gallery One",
        categoriesCsv: "art, featured",
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id: "evt-new" })
  })

  it("uploads an event image and assigns next ordinal", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/SELECT id FROM events WHERE id=\$1/.test(sql)) {
        expect(params).toEqual(["evt-3"])
        return { rows: [{ id: "evt-3" }], rowCount: 1 }
      }
      if (/SELECT COALESCE\(MAX\(ord\), -1\) as max FROM event_images/.test(sql)) {
        return { rows: [{ max: 2 }], rowCount: 1 }
      }
      if (/INSERT INTO event_images/.test(sql)) {
        expect(params).toEqual(["img-new", "evt-3", "https://example.com/new.jpg", null, null, 3])
        return { rows: [], rowCount: 1 }
      }
      return baseQueryHandler(sql)
    })

    cuidMock.mockReturnValueOnce("img-new")

    app = await createApp()
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/events/evt-3/images",
      headers: authorize(),
      payload: { url: "https://example.com/new.jpg" },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id: "img-new", url: "https://example.com/new.jpg", ord: 3 })
  })

  it("updates an existing event", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/UPDATE events SET/.test(sql)) {
        expect(params).toEqual([
          "evt-4",
          "Updated Title",
          "Updated summary",
          "2024-08-01T12:00:00.000Z",
          "2024-08-01T15:00:00.000Z",
          "Updated Venue",
          ["business"],
          "updated title updated summary updated venue business",
        ])
        return { rows: [], rowCount: 1 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "PUT",
      url: "/api/admin/events/evt-4",
      headers: authorize(),
      payload: {
        title: "Updated Title",
        summary: "Updated summary",
        startsAt: "2024-08-01T12:00:00.000Z",
        endsAt: "2024-08-01T15:00:00.000Z",
        venueName: "Updated Venue",
        categoriesCsv: "business",
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id: "evt-4" })
  })

  it("deletes an event by id", async () => {
    queryMock.mockImplementation(async (text: string | { text: string }, params?: any[]) => {
      const sql = typeof text === "string" ? text : text.text
      if (/DELETE FROM events WHERE id=\$1/.test(sql)) {
        expect(params).toEqual(["evt-5"])
        return { rows: [], rowCount: 1 }
      }
      return baseQueryHandler(sql)
    })

    app = await createApp()
    const response = await app.inject({
      method: "DELETE",
      url: "/api/admin/events/evt-5",
      headers: authorize(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ id: "evt-5" })
  })
})

