import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db.js";
import { cuid } from "../utils.js";
import { requireUser } from "../auth.js";

export default async function bookmarkRoutes(app: FastifyInstance) {
  const addSchema = z.object({ eventId: z.string() });

  app.get("/me/bookmarks", { preHandler: requireUser }, async (req) => {
    const user = (req as any).user as { id: string };
    const { rows } = await query(
      `SELECT b.event_id as id, e.title, e.summary, e.starts_at, e.ends_at,
              (SELECT url FROM event_images i WHERE i.event_id=e.id ORDER BY ord ASC LIMIT 1) as cover_url,
              v.name as venue_name, v.lat, v.lng, v.zone, v.subzone
       FROM bookmarks b
       JOIN events e ON e.id=b.event_id
       LEFT JOIN venues v ON v.id=e.venue_id
       WHERE b.user_id=$1
       ORDER BY b.created_at DESC`,
      [user.id]
    );
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      startsAt: new Date(r.starts_at).toISOString(),
      endsAt: new Date(r.ends_at).toISOString(),
      coverUrl: r.cover_url || undefined,
      venue: { id: undefined as any, name: r.venue_name, lat: r.lat, lng: r.lng, zone: r.zone || undefined, subzone: r.subzone || undefined }
    }));
  });

  app.post("/me/bookmarks", { preHandler: requireUser }, async (req, reply) => {
    const body = addSchema.parse(req.body);
    const user = (req as any).user as { id: string };
    try {
      await query(
        `INSERT INTO bookmarks (id, user_id, event_id) VALUES ($1,$2,$3)`,
        [cuid(), user.id, body.eventId]
      );
    } catch (e: any) {
      // likely duplicate
    }
    reply.code(201).send({ ok: true });
  });

  app.delete<{ Params: { eventId: string } }>("/me/bookmarks/:eventId", { preHandler: requireUser }, async (req) => {
    const user = (req as any).user as { id: string };
    await query(`DELETE FROM bookmarks WHERE user_id=$1 AND event_id=$2`, [user.id, req.params.eventId]);
    return { ok: true };
  });
}


