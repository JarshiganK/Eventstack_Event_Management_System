import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db.js";
import { cuid, iso } from "../utils.js";
import { requireOrganizerOrAdmin } from "../auth.js";

export default async function eventRoutes(app: FastifyInstance) {
  const baseSchema = z.object({
    title: z.string().min(1),
    summary: z.string().optional().nullable(),
    startsAt: z.string(),
    endsAt: z.string(),
    venueId: z.string(),
    categoriesCsv: z.string().optional().default("")
  });

  app.get("/events", async (req) => {
    const q = (req.query || {}) as Record<string, string | undefined>;
    const where: string[] = [];
    const params: any[] = [];
    if (q.from) {
      params.push(q.from);
      where.push(`starts_at >= $${params.length}`);
    }
    if (q.to) {
      params.push(q.to);
      where.push(`ends_at <= $${params.length}`);
    }
    if (q.category) {
      params.push(q.category);
      where.push(`$${params.length} = ANY(categories)`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const { rows } = await query(
      `SELECT e.*, v.name AS venue_name, v.lat, v.lng,
              (SELECT url FROM event_images i WHERE i.event_id=e.id ORDER BY ord ASC LIMIT 1) as cover_url
       FROM events e
       LEFT JOIN venues v ON v.id=e.venue_id
       ${whereSql}
       ORDER BY starts_at ASC`,
      params
    );
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      startsAt: iso(r.starts_at),
      endsAt: iso(r.ends_at),
      categories: r.categories || [],
      coverUrl: r.cover_url || undefined,
      venue: { id: r.venue_id, name: r.venue_name, lat: r.lat, lng: r.lng }
    }));
  });

  app.get<{ Params: { id: string } }>("/events/:id", async (req, reply) => {
    const { id } = req.params;
    const { rows } = await query(
      `SELECT e.*, v.name AS venue_name, v.lat, v.lng
       FROM events e LEFT JOIN venues v ON v.id=e.venue_id WHERE e.id=$1`,
      [id]
    );
    const r = rows[0];
    if (!r) {
      reply.code(404).send({ error: "Not found" });
      return;
    }
    const { rows: img } = await query(`SELECT * FROM event_images WHERE event_id=$1 ORDER BY ord ASC`, [id]);
    return {
      id: r.id,
      title: r.title,
      summary: r.summary,
      startsAt: iso(r.starts_at),
      endsAt: iso(r.ends_at),
      categories: r.categories || [],
      images: img,
      venue: { id: r.venue_id, name: r.venue_name, lat: r.lat, lng: r.lng }
    };
  });

  app.post("/admin/events", { preHandler: requireOrganizerOrAdmin }, async (req) => {
    const body = baseSchema.parse(req.body);
    const id = cuid();
    const categories = body.categoriesCsv ? body.categoriesCsv.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const { rows: vrows } = await query(`SELECT name FROM venues WHERE id=$1`, [body.venueId]);
    const venueName = vrows[0]?.name || "";
    const searchable = [body.title, body.summary ?? "", venueName, categories.join(" ")].join(" ").toLowerCase();
    await query(
      `INSERT INTO events (id,title,summary,starts_at,ends_at,venue_id,categories,searchable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, body.title, body.summary ?? null, body.startsAt, body.endsAt, body.venueId, categories, searchable]
    );
    return { id };
  });

  app.put<{ Params: { id: string } }>("/admin/events/:id", { preHandler: requireOrganizerOrAdmin }, async (req) => {
    const body = baseSchema.parse(req.body);
    const { id } = req.params;
    const categories = body.categoriesCsv ? body.categoriesCsv.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const { rows: vrows } = await query(`SELECT name FROM venues WHERE id=$1`, [body.venueId]);
    const venueName = vrows[0]?.name || "";
    const searchable = [body.title, body.summary ?? "", venueName, categories.join(" ")].join(" ").toLowerCase();
    await query(
      `UPDATE events SET title=$2,summary=$3,starts_at=$4,ends_at=$5,venue_id=$6,categories=$7,searchable=$8,updated_at=now() WHERE id=$1`,
      [id, body.title, body.summary ?? null, body.startsAt, body.endsAt, body.venueId, categories, searchable]
    );
    return { id };
  });

  app.delete<{ Params: { id: string } }>("/admin/events/:id", { preHandler: requireOrganizerOrAdmin }, async (req) => {
    const { id } = req.params;
    await query(`DELETE FROM events WHERE id=$1`, [id]);
    return { id };
  });
}


