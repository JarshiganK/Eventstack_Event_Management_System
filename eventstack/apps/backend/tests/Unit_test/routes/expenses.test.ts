import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  requireOrganizerOrAdmin: vi.fn(),
  cuid: vi.fn(),
  iso: vi.fn(),
}));

vi.mock("../../../src/db.js", () => ({
  query: mocks.query,
}));

vi.mock("../../../src/auth.js", () => ({
  requireOrganizerOrAdmin: mocks.requireOrganizerOrAdmin,
}));

vi.mock("../../../src/utils.js", () => ({
  cuid: (...args: unknown[]) => mocks.cuid(...args),
  iso: (...args: unknown[]) => mocks.iso(...args),
}));

type HandlerCollection = ReturnType<typeof createMockFastify>["handlers"];

function findHandler(
  handlers: HandlerCollection,
  method: keyof HandlerCollection,
  path: string,
) {
  const mockFn = handlers[method] as any;
  const call = mockFn.mock.calls.find((entry: any[]) => entry[0] === path);
  if (!call) return undefined;
  if (call.length === 2) return call[1];
  return call[2];
}

function createReply() {
  return {
    statusCode: undefined as number | undefined,
    payload: undefined as unknown,
    code(this: any, status: number) {
      this.statusCode = status;
      return this;
    },
    send(this: any, body: unknown) {
      this.payload = body;
      return this;
    },
  };
}

beforeEach(() => {
  mocks.query.mockReset();
  mocks.requireOrganizerOrAdmin.mockReset();
  mocks.cuid.mockReset();
  mocks.iso.mockReset();
  mocks.iso.mockImplementation((input: Date | string) => new Date(input).toISOString());
});

describe("routes/expenses", () => {
  it("seeds ledger when empty and handles CRUD operations", async () => {
    const { app, handlers } = createMockFastify();
    const eventRow = {
      id: "evt-1",
      title: "Launch Event",
      starts_at: new Date("2024-06-10T00:00:00.000Z"),
      venue_name: "Grand Hall",
    };

    const seededRows = [
      {
        id: "exp-1",
        label: "Venue reservation - Launch",
        category: "Venue",
        vendor: "Venue Partners",
        quantity: 1,
        estimated_cost: "7500",
        actual_cost: "7500",
        status: "PAID",
        incurred_on: "2024-04-10",
        notes: null,
        created_at: "2024-03-01T00:00:00.000Z",
        updated_at: "2024-03-05T00:00:00.000Z",
      },
      {
        id: "exp-2",
        label: "Marketing blitz - Launch",
        category: "Marketing",
        vendor: "Ad Studio",
        quantity: 3,
        estimated_cost: "2500",
        actual_cost: "0",
        status: "PLANNED",
        incurred_on: "2024-05-26",
        notes: "Campaign kickoff",
        created_at: "2024-03-03T00:00:00.000Z",
        updated_at: "2024-03-03T00:00:00.000Z",
      },
    ];

    const insertedExpenses: any[] = [];
    const updateCalls: any[] = [];
    const deleteCalls: any[] = [];
    const tableChecks = [true, true, true];
    const updateRowCounts = [1];
    const deleteRowCounts = [1];
    let cuidCounter = 0;

    mocks.cuid.mockImplementation(() => `seed-${++cuidCounter}`);

    mocks.query.mockImplementation(async (sql: string, params: any[] = []) => {
      const statement = sql.replace(/\s+/g, " ").trim();
      if (statement.includes("CREATE TABLE IF NOT EXISTS event_expenses")) {
        return {};
      }
      if (statement.includes("CREATE INDEX IF NOT EXISTS idx_event_expenses_event")) {
        return {};
      }
      if (statement.includes("to_regclass('public.event_expenses')")) {
        const value = tableChecks.shift() ?? true;
        return { rows: [{ table_exists: value }] };
      }
      if (
        statement.includes("SELECT id, title, starts_at, venue_name FROM events WHERE id=$1")
      ) {
        if (params[0] === "missing") return { rows: [] };
        return { rows: [eventRow] };
      }
      if (
        statement.includes("SELECT id, title, starts_at, venue_name FROM events") &&
        !statement.includes("WHERE id=$1")
      ) {
        return { rows: [eventRow] };
      }
      if (
        statement.includes("SELECT *") &&
        statement.includes("FROM event_expenses") &&
        statement.includes("LIMIT 1")
      ) {
        return { rows: [] };
      }
      if (
        statement.includes("SELECT *") &&
        statement.includes("FROM event_expenses")
      ) {
        return { rows: seededRows };
      }
      if (statement.includes("INSERT INTO event_expenses")) {
        insertedExpenses.push(params);
        return {};
      }
      if (statement.includes("UPDATE event_expenses")) {
        updateCalls.push(params);
        return { rowCount: updateRowCounts.shift() ?? 1 };
      }
      if (statement.includes("DELETE FROM event_expenses")) {
        deleteCalls.push(params);
        return { rowCount: deleteRowCounts.shift() ?? 1 };
      }
      throw new Error(`Unhandled SQL in test: ${statement}`);
    });

    const register = (await import("../../../src/routes/expenses.js")).default;
    await register(app);

    // seeding inserts four templates
    expect(insertedExpenses).toHaveLength(4);
    expect(mocks.cuid).toHaveBeenCalledTimes(4);

    const getHandler = findHandler(handlers, "get", "/events/:eventId/expenses") as (
      req: any,
    ) => Promise<any>;
    const postHandler = findHandler(handlers, "post", "/events/:eventId/expenses") as (
      req: any,
      reply: any,
    ) => Promise<any>;
    const putHandler = findHandler(
      handlers,
      "put",
      "/events/:eventId/expenses/:expenseId",
    ) as (req: any, reply: any) => Promise<any>;
    const deleteHandler = findHandler(
      handlers,
      "delete",
      "/events/:eventId/expenses/:expenseId",
    ) as (req: any, reply: any) => Promise<any>;

    expect(getHandler).toBeDefined();
    expect(postHandler).toBeDefined();
    expect(putHandler).toBeDefined();
    expect(deleteHandler).toBeDefined();

    const ledger = await getHandler({ params: { eventId: "evt-1" } });
    expect(ledger.event).toEqual({
      id: "evt-1",
      title: "Launch Event",
      startsAt: "2024-06-10T00:00:00.000Z",
      venueName: "Grand Hall",
    });
    expect(ledger.items).toHaveLength(2);
    expect(ledger.summary.plannedTotal).toBeCloseTo(10000);
    expect(ledger.summary.actualTotal).toBeCloseTo(7500);
    expect(ledger.summary.byCategory[0]).toMatchObject({ category: "Venue" });

    mocks.cuid.mockReturnValueOnce("manual-expense");
    const postReply = createReply();
    await postHandler(
      {
        params: { eventId: "evt-1" },
        body: {
          label: "Custom hire",
          category: "Staffing",
          vendor: null,
          quantity: 2,
          estimatedCost: 600,
          actualCost: 500,
          status: "COMMITTED",
          incurredOn: "2024-06-01",
          notes: "Temporary staff",
        },
      },
      postReply,
    );
    expect(postReply.statusCode).toBe(201);
    expect(postReply.payload).toEqual({ id: "manual-expense" });
    expect(insertedExpenses.at(-1)).toEqual([
      "manual-expense",
      "evt-1",
      "Custom hire",
      "Staffing",
      null,
      2,
      600,
      500,
      "COMMITTED",
      "2024-06-01",
      "Temporary staff",
    ]);

    const putReply = createReply();
    const putResult = await putHandler(
      {
        params: { eventId: "evt-1", expenseId: "exp-1" },
        body: {
          label: "Venue reservation",
          category: "Venue",
          vendor: "Venue Partners",
          quantity: 1,
          estimatedCost: 7600,
          actualCost: 7600,
          status: "PAID",
          incurredOn: "2024-04-11",
          notes: "Confirmed",
        },
      },
      putReply,
    );
    expect(updateCalls.at(-1)).toEqual([
      "exp-1",
      "evt-1",
      "Venue reservation",
      "Venue",
      "Venue Partners",
      1,
      7600,
      7600,
      "PAID",
      "2024-04-11",
      "Confirmed",
    ]);
    expect(putResult).toEqual({ id: "exp-1" });

    const deleteReply = createReply();
    const deleteResult = await deleteHandler(
      { params: { eventId: "evt-1", expenseId: "exp-2" } },
      deleteReply,
    );
    expect(deleteCalls.at(-1)).toEqual(["exp-2", "evt-1"]);
    expect(deleteResult).toEqual({ id: "exp-2" });

    // ensure preHandlers attached
    expect(findHandler(handlers, "post", "/events/:eventId/expenses")).toBeDefined();
    expect(handlers.post.mock.calls[0]?.[1]).toEqual({
      preHandler: mocks.requireOrganizerOrAdmin,
    });
  });

  it("returns proper errors when event or expense is missing", async () => {
    const { app, handlers } = createMockFastify();
    const tableChecks = [false]; // skip seeding entirely

    mocks.query.mockImplementation(async (sql: string, params: any[] = []) => {
      const statement = sql.replace(/\s+/g, " ").trim();
      if (statement.includes("CREATE TABLE IF NOT EXISTS event_expenses")) return {};
      if (statement.includes("CREATE INDEX IF NOT EXISTS idx_event_expenses_event")) return {};
      if (statement.includes("to_regclass('public.event_expenses')")) {
        const value = tableChecks.shift() ?? false;
        return { rows: [{ table_exists: value }] };
      }
      if (statement.includes("SELECT id, title, starts_at, venue_name FROM events WHERE id=$1")) {
        if (params[0] === "evt-1") {
          return {
            rows: [
              {
                id: "evt-1",
                title: "Launch Event",
                starts_at: new Date("2024-06-10T00:00:00.000Z"),
                venue_name: "Grand Hall",
              },
            ],
          };
        }
        return { rows: [] };
      }
      if (statement.includes("UPDATE event_expenses")) return { rowCount: 0 };
      if (statement.includes("DELETE FROM event_expenses")) return { rowCount: 0 };
      throw new Error(`Unhandled SQL in error test: ${statement}`);
    });

    const register = (await import("../../../src/routes/expenses.js")).default;
    await register(app);

    const getHandler = findHandler(handlers, "get", "/events/:eventId/expenses") as (
      req: any,
      reply: any,
    ) => Promise<any>;
    const postHandler = findHandler(handlers, "post", "/events/:eventId/expenses") as (
      req: any,
      reply: any,
    ) => Promise<any>;
    const putHandler = findHandler(
      handlers,
      "put",
      "/events/:eventId/expenses/:expenseId",
    ) as (req: any, reply: any) => Promise<any>;
    const deleteHandler = findHandler(
      handlers,
      "delete",
      "/events/:eventId/expenses/:expenseId",
    ) as (req: any, reply: any) => Promise<any>;

    const reply = createReply();
    await getHandler({ params: { eventId: "missing" } }, reply);
    expect(reply.statusCode).toBe(404);
    expect(reply.payload).toEqual({ error: "Event not found" });

    const postReply = createReply();
    await postHandler(
      { params: { eventId: "missing" }, body: { label: "", category: "" } },
      postReply,
    );
    expect(postReply.statusCode).toBe(404);
    expect(postReply.payload).toEqual({ error: "Event not found" });

    const putReply = createReply();
    await putHandler(
      {
        params: { eventId: "evt-1", expenseId: "exp-404" },
        body: {
          label: "Test",
          category: "General",
          quantity: 1,
          estimatedCost: 0,
          actualCost: 0,
          status: "PLANNED",
        },
      },
      putReply,
    );
    expect(putReply.statusCode).toBe(404);
    expect(putReply.payload).toEqual({ error: "Expense not found" });

    const deleteReply = createReply();
    await deleteHandler(
      { params: { eventId: "evt-1", expenseId: "exp-404" } },
      deleteReply,
    );
    expect(deleteReply.statusCode).toBe(404);
    expect(deleteReply.payload).toEqual({ error: "Expense not found" });
  });

  it("warns when expenses table is missing", async () => {
    const { app, handlers } = createMockFastify();

    mocks.query.mockImplementation(async (sql: string, params: any[] = []) => {
      const statement = sql.replace(/\s+/g, " ").trim();
      if (statement.includes("CREATE TABLE IF NOT EXISTS event_expenses")) return {};
      if (statement.includes("CREATE INDEX IF NOT EXISTS idx_event_expenses_event")) return {};
      if (statement.includes("to_regclass('public.event_expenses')")) {
        return { rows: [{ table_exists: false }] };
      }
      if (statement.includes("SELECT id, title, starts_at, venue_name FROM events WHERE id=$1")) {
        return {
          rows: [
            {
              id: "evt-1",
              title: "Launch Event",
              starts_at: new Date("2024-06-10T00:00:00.000Z"),
              venue_name: null,
            },
          ],
        };
      }
      throw new Error(`Unhandled SQL in warn test: ${statement}`);
    });

    const register = (await import("../../../src/routes/expenses.js")).default;
    await register(app);

    const getHandler = findHandler(handlers, "get", "/events/:eventId/expenses") as (
      req: any,
    ) => Promise<any>;

    const result = await getHandler({ params: { eventId: "evt-1" } });
    expect(app.log.warn).toHaveBeenCalledWith(
      "event_expenses table missing; returning empty ledger",
    );
    expect(result.items).toEqual([]);
    expect(result.summary).toMatchObject({
      plannedTotal: 0,
      actualTotal: 0,
      variance: 0,
      itemCount: 0,
    });
  });
});
