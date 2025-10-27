import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { query } from "../db.js";
import { requireOrganizerOrAdmin } from "../auth.js";
import { cuid, iso } from "../utils.js";

const STATUS_OPTIONS = ["PLANNED", "COMMITTED", "PAID"] as const;

const numberFrom = (value: unknown, fallback: number) => {
  if (value === null || value === undefined || value === "") return fallback;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : fallback;
};

const expenseBodySchema = z.object({
  label: z.string().min(1),
  category: z.string().min(1),
  vendor: z.string().optional().nullable(),
  quantity: z.preprocess((val) => numberFrom(val, 1), z.number().nonnegative()),
  estimatedCost: z.preprocess((val) => numberFrom(val, 0), z.number().nonnegative()),
  actualCost: z.preprocess((val) => numberFrom(val, 0), z.number().nonnegative()),
  status: z.enum(STATUS_OPTIONS).default("PLANNED"),
  incurredOn: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !Number.isNaN(Date.parse(val)), { message: "Invalid date" }),
  notes: z.string().optional().nullable()
});

type ExpenseTemplate = {
  label: string;
  category: string;
  vendor?: string;
  quantity: number;
  estimatedCost: number;
  actualCost: number;
  status: (typeof STATUS_OPTIONS)[number];
  offsetDays?: number;
  notes?: string;
};

const MOCK_EXPENSE_TEMPLATES: ExpenseTemplate[] = [
  {
    label: "Venue reservation",
    category: "Venue",
    vendor: "Venue Partners",
    quantity: 1,
    estimatedCost: 7500,
    actualCost: 7500,
    status: "PAID",
    offsetDays: 60,
    notes: "Deposit paid to secure the space."
  },
  {
    label: "Production & AV crew",
    category: "Production",
    vendor: "Stage Ninjas",
    quantity: 1,
    estimatedCost: 4200,
    actualCost: 3500,
    status: "COMMITTED",
    offsetDays: 30,
    notes: "Lighting, audio and livestream package."
  },
  {
    label: "Marketing blitz",
    category: "Marketing",
    vendor: "Ad Studio",
    quantity: 3,
    estimatedCost: 2500,
    actualCost: 0,
    status: "PLANNED",
    offsetDays: 15,
    notes: "Paid social + newsletter swaps."
  },
  {
    label: "Hospitality & catering",
    category: "Food & Beverage",
    vendor: "TasteLab",
    quantity: 250,
    estimatedCost: 5800,
    actualCost: 0,
    status: "PLANNED",
    offsetDays: 7,
    notes: "Per-guest estimate includes coffee service."
  }
];

type EventRow = {
  id: string;
  title: string;
  starts_at: Date;
  venue_name: string | null;
};

const expensesRoutes: FastifyPluginAsync = async (app) => {
  await ensureExpensesTable(app);
  await ensureMockExpensesForExistingEvents();

  async function ensureEvent(eventId: string) {
    const { rows } = await query<EventRow>(`SELECT id, title, starts_at, venue_name FROM events WHERE id=$1`, [eventId]);
    return rows[0];
  }

  app.get<{ Params: { eventId: string } }>(
    "/events/:eventId/expenses",
    { preHandler: requireOrganizerOrAdmin },
    async (req, reply) => {
      const { eventId } = req.params;
      const event = await ensureEvent(eventId);
      if (!event) {
        reply.code(404).send({ error: "Event not found" });
        return;
      }

      const hasExpensesTable = await expensesTableExists();
      if (!hasExpensesTable) {
        app.log.warn("event_expenses table missing; returning empty ledger");
      }

      let rows: any[] = [];

      if (hasExpensesTable) {
        rows = await fetchExpensesForEvent(eventId);

        if (!rows.length) {
          await seedMockExpenses(event);
          rows = await fetchExpensesForEvent(eventId);
        }
      }

      const items = rows.map(mapExpenseRow);
      const summary = buildSummary(items);
      return {
        event: {
          id: event.id,
          title: event.title,
          startsAt: iso(event.starts_at),
          venueName: event.venue_name
        },
        items,
        summary
      };
    }
  );

  app.post<{ Params: { eventId: string } }>(
    "/events/:eventId/expenses",
    { preHandler: requireOrganizerOrAdmin },
    async (req, reply) => {
      const { eventId } = req.params;
      const event = await ensureEvent(eventId);
      if (!event) {
        reply.code(404).send({ error: "Event not found" });
        return;
      }
      const body = expenseBodySchema.parse(req.body);
      const id = cuid();
      await query(
        `INSERT INTO event_expenses
          (id, event_id, label, category, vendor, quantity, estimated_cost, actual_cost, status, incurred_on, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          id,
          eventId,
          body.label,
          body.category,
          body.vendor ?? null,
          body.quantity,
          body.estimatedCost,
          body.actualCost,
          body.status,
          body.incurredOn ? body.incurredOn : null,
          body.notes ?? null
        ]
      );
      reply.code(201).send({ id });
    }
  );

  app.put<{ Params: { eventId: string; expenseId: string } }>(
    "/events/:eventId/expenses/:expenseId",
    { preHandler: requireOrganizerOrAdmin },
    async (req, reply) => {
      const { eventId, expenseId } = req.params;
      const event = await ensureEvent(eventId);
      if (!event) {
        reply.code(404).send({ error: "Event not found" });
        return;
      }
      const body = expenseBodySchema.parse(req.body);
      const { rowCount } = await query(
        `UPDATE event_expenses
           SET label=$3,
               category=$4,
               vendor=$5,
               quantity=$6,
               estimated_cost=$7,
               actual_cost=$8,
               status=$9,
               incurred_on=$10,
               notes=$11,
               updated_at=now()
         WHERE id=$1 AND event_id=$2`,
        [
          expenseId,
          eventId,
          body.label,
          body.category,
          body.vendor ?? null,
          body.quantity,
          body.estimatedCost,
          body.actualCost,
          body.status,
          body.incurredOn ? body.incurredOn : null,
          body.notes ?? null
        ]
      );
      if (!rowCount) {
        reply.code(404).send({ error: "Expense not found" });
        return;
      }
      return { id: expenseId };
    }
  );

  app.delete<{ Params: { eventId: string; expenseId: string } }>(
    "/events/:eventId/expenses/:expenseId",
    { preHandler: requireOrganizerOrAdmin },
    async (req, reply) => {
      const { eventId, expenseId } = req.params;
      const event = await ensureEvent(eventId);
      if (!event) {
        reply.code(404).send({ error: "Event not found" });
        return;
      }
      const { rowCount } = await query(`DELETE FROM event_expenses WHERE id=$1 AND event_id=$2`, [expenseId, eventId]);
      if (!rowCount) {
        reply.code(404).send({ error: "Expense not found" });
        return;
      }
      return { id: expenseId };
    }
  );
};

async function ensureMockExpensesForExistingEvents() {
  if (!(await expensesTableExists())) return;
  const { rows } = await query<EventRow>(`SELECT id, title, starts_at, venue_name FROM events`);
  for (const event of rows) {
    const existing = await fetchExpensesForEvent(event.id, 1);
    if (!existing.length) {
      await seedMockExpenses(event);
    }
  }
}

async function seedMockExpenses(event: EventRow) {
  const titleKeyword = (event.title || "Event").split(" ")[0] ?? "Event";
  if (!(await expensesTableExists())) return;
  for (const template of MOCK_EXPENSE_TEMPLATES) {
    const id = cuid();
    const incurredOn = relativeDateString(event.starts_at, template.offsetDays);
    await query(
      `INSERT INTO event_expenses
        (id, event_id, label, category, vendor, quantity, estimated_cost, actual_cost, status, incurred_on, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        event.id,
        `${template.label} - ${titleKeyword}`,
        template.category,
        template.vendor ?? null,
        template.quantity,
        template.estimatedCost,
        template.actualCost,
        template.status,
        incurredOn,
        template.notes ?? null
      ]
    );
  }
}

async function ensureExpensesTable(app: Parameters<FastifyPluginAsync>[0]) {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS event_expenses (
        id text PRIMARY KEY,
        event_id text REFERENCES events(id) ON DELETE CASCADE,
        label text NOT NULL,
        category text NOT NULL DEFAULT 'GENERAL',
        vendor text,
        quantity numeric(12,2) DEFAULT 1,
        estimated_cost numeric(14,2) DEFAULT 0,
        actual_cost numeric(14,2) DEFAULT 0,
        status text NOT NULL DEFAULT 'PLANNED',
        incurred_on date,
        notes text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        CONSTRAINT event_expenses_status_check CHECK (status IN ('PLANNED','COMMITTED','PAID'))
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_event_expenses_event ON event_expenses(event_id)`);
  } catch (err) {
    app.log.error({ err }, "Unable to ensure event_expenses table");
  }
}

async function expensesTableExists() {
  const { rows } = await query<{ table_exists: boolean }>(
    `SELECT to_regclass('public.event_expenses') IS NOT NULL AS table_exists`
  );
  const value = rows[0]?.table_exists;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "t";
  return false;
}

async function fetchExpensesForEvent(eventId: string, limit?: number) {
  const limitSql = limit ? `LIMIT ${Number(limit)}` : "";
  const { rows } = await query<any>(
    `SELECT *
       FROM event_expenses
      WHERE event_id=$1
      ORDER BY incurred_on DESC NULLS LAST, created_at DESC
      ${limitSql}`,
    [eventId]
  );
  return rows;
}

function relativeDateString(base: Date | string | null, offsetDays?: number) {
  if (!base || typeof offsetDays !== "number") return null;
  const date = new Date(base);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() - offsetDays);
  return date.toISOString().slice(0, 10);
}

function mapExpenseRow(row: any) {
  return {
    id: row.id,
    label: row.label,
    category: row.category,
    vendor: row.vendor || null,
    quantity: Number(row.quantity ?? 0),
    estimatedCost: Number(row.estimated_cost ?? 0),
    actualCost: Number(row.actual_cost ?? 0),
    status: row.status,
    incurredOn: row.incurred_on ? new Date(row.incurred_on).toISOString().slice(0, 10) : null,
    notes: row.notes || null,
    createdAt: row.created_at ? iso(row.created_at) : null,
    updatedAt: row.updated_at ? iso(row.updated_at) : null
  };
}

function buildSummary(items: ReturnType<typeof mapExpenseRow>[]) {
  const plannedTotal = items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);
  const actualTotal = items.reduce((sum, item) => sum + (item.actualCost || 0), 0);
  const categoryMap = new Map<
    string,
    { category: string; planned: number; actual: number }
  >();
  const statusMap = new Map<string, number>();

  items.forEach((item) => {
    const categoryKey = item.category || "Uncategorized";
    const cat = categoryMap.get(categoryKey) || { category: categoryKey, planned: 0, actual: 0 };
    cat.planned += item.estimatedCost || 0;
    cat.actual += item.actualCost || 0;
    categoryMap.set(categoryKey, cat);

    const statusKey = item.status || "PLANNED";
    statusMap.set(statusKey, (statusMap.get(statusKey) || 0) + (item.actualCost || 0));
  });

  return {
    plannedTotal,
    actualTotal,
    variance: actualTotal - plannedTotal,
    itemCount: items.length,
    averageActual: items.length ? actualTotal / items.length : 0,
    byCategory: Array.from(categoryMap.values()).sort((a, b) => b.actual - a.actual),
    byStatus: Array.from(statusMap.entries()).map(([status, total]) => ({ status, total }))
  };
}

export default expensesRoutes;
