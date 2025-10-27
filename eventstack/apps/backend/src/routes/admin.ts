import type { FastifyPluginAsync } from "fastify";
import { query, pool } from "../db.js";
import { requireAdmin } from "../auth.js";
import { z } from "zod";

const adminRoutes: FastifyPluginAsync = async (app) => {
  // Ensure users.status column exists for account status management
  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE';
  `);
  // Add a CHECK constraint if missing (Postgres will error if name clashes; use inline check in updates instead)

  type CountRow = { count: string };
  type CategoryRow = { category: string; count: string };

  // GET /api/admin/analytics - Get dashboard analytics
  app.get(
    "/admin/analytics",
    { preHandler: requireAdmin },
    async (req, reply) => {
      const client = await pool.connect();
      try {
        // Total number of events
        const eventsCountResult = await client.query(
          "SELECT COUNT(*) as count FROM events"
        );
        const totalEvents = parseInt(eventsCountResult.rows[0].count, 10);

        // Total users
        const usersCountResult = await client.query(
          "SELECT COUNT(*) as count FROM users"
        );
        const totalUsers = parseInt(usersCountResult.rows[0].count, 10);

        // Active events (events that have started but not ended)
        const activeEventsResult = await client.query(
          `SELECT COUNT(*) as count FROM events 
           WHERE starts_at <= NOW() AND (ends_at IS NULL OR ends_at >= NOW())`
        );
        const activeEvents = parseInt(activeEventsResult.rows[0].count, 10);

        // Upcoming events (events that haven't started yet)
        const upcomingEventsResult = await client.query(
          `SELECT COUNT(*) as count FROM events WHERE starts_at > NOW()`
        );
        const upcomingEvents = parseInt(upcomingEventsResult.rows[0].count, 10);

        // Event categories distribution
        const categoriesResult = await client.query(
          `SELECT 
            unnest(categories) as category,
            COUNT(*) as count
           FROM events
           WHERE categories IS NOT NULL AND array_length(categories, 1) > 0
           GROUP BY category
           ORDER BY count DESC, category ASC`
        );

        const categoriesDistribution = categoriesResult.rows.map((row: CategoryRow) => ({          
          category: row.category,
          count: parseInt(row.count, 10),
        }));

        return reply.send({
          totalEvents,
          totalUsers,
          activeEvents,
          upcomingEvents,
          categoriesDistribution,
        });
      } catch (error) {
        app.log.error(error);
        return reply.status(500).send({ error: "Failed to fetch analytics" });
      } finally {
        client.release();
      }
    }
  );

  // GET /api/admin/users?role=ORGANIZER|ADMIN|USER
  app.get("/admin/users", { preHandler: requireAdmin }, async (req) => {
    const { role } = (req.query || {}) as { role?: string };
    const params: any[] = [];
    const where: string[] = [];
    if (role) {
      params.push(role.toUpperCase());
      where.push(`role = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT id, email, role, COALESCE(status,'ACTIVE') as status, created_at
       FROM users
       ${whereSql}
       ORDER BY created_at DESC`,
      params
    );
    return rows;
  });

  // PATCH /api/admin/users/:id/role
  app.patch<{ Params: { id: string } }>(
    "/admin/users/:id/role",
    { preHandler: requireAdmin },
    async (req, reply) => {
      const { id } = req.params;
      const body = z
        .object({ role: z.enum(["ADMIN", "USER", "ORGANIZER"]) })
        .parse(req.body);

      // Prevent deleting the last admin role accidentally by demoting last admin
      if (body.role !== "ADMIN") {
        const { rows } = await query<CountRow>(
          `SELECT COUNT(*) as count FROM users WHERE role='ADMIN' AND id <> $1`,
          [id]
        );
        const remaining = parseInt(rows[0]?.count ?? "0", 10);
        // If the target user is currently ADMIN and there are 0 other admins, block
        const { rows: targetRows } = await query<{ role: string }>(
          `SELECT role FROM users WHERE id=$1`,
          [id]
        );
        const currentRole = targetRows[0]?.role?.toUpperCase();
        if (currentRole === "ADMIN" && remaining === 0) {
          reply.code(400).send({ error: "Cannot demote the last admin" });
          return;
        }
      }

      await query(`UPDATE users SET role=$2 WHERE id=$1`, [id, body.role]);
      return { id, role: body.role };
    }
  );

  // PATCH /api/admin/users/:id/status
  app.patch<{ Params: { id: string } }>(
    "/admin/users/:id/status",
    { preHandler: requireAdmin },
    async (req) => {
      const { id } = req.params;
      const body = z
        .object({ status: z.enum(["ACTIVE", "SUSPENDED"]) })
        .parse(req.body);
      await query(`UPDATE users SET status=$2 WHERE id=$1`, [id, body.status]);
      return { id, status: body.status };
    }
  );

  // DELETE /api/admin/users/:id
  app.delete<{ Params: { id: string } }>(
    "/admin/users/:id",
    { preHandler: requireAdmin },
    async (req, reply) => {
      const { id } = req.params;
      const me = (req as any).user as { id: string } | undefined;
      if (me?.id === id) {
        reply.code(400).send({ error: "You cannot delete your own account" });
        return;
      }
      const { rows: roleRows } = await query<{ role: string }>(`SELECT role FROM users WHERE id=$1`, [id]);
      if (!roleRows[0]) {
        reply.code(404).send({ error: "User not found" });
        return;
      }
      if (roleRows[0].role?.toUpperCase() === "ADMIN") {
        const { rows } = await query<CountRow>(
          `SELECT COUNT(*) as count FROM users WHERE role='ADMIN' AND id<>$1`,
          [id]
        );
        if (parseInt(rows[0]?.count ?? "0", 10) === 0) {
          reply.code(400).send({ error: "Cannot delete the last admin" });
          return;
        }
      }
      await query(`DELETE FROM users WHERE id=$1`, [id]);
      return { id };
    }
  );
};

export default adminRoutes;
