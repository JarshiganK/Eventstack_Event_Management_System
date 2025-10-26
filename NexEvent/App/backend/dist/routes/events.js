import { z } from "zod";
import { query } from "../db.js";
import { cuid, iso } from "../utils.js";
import { requireOrganizerOrAdmin } from "../auth.js";
export default async function eventRoutes(app) {
    const baseSchema = z.object({
        title: z.string().min(1),
        summary: z.string().optional().nullable(),
        startsAt: z.string(),
        endsAt: z.string(),
        venueName: z.string().optional().nullable(),
        categoriesCsv: z.string().optional().default("")
    });
    app.get("/events", async (req) => {
        const q = (req.query || {});
        const where = [];
        const params = [];
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
        const { rows } = await query(`SELECT e.*,
              (SELECT url FROM event_images i WHERE i.event_id=e.id ORDER BY ord ASC LIMIT 1) as cover_url
       FROM events e
       ${whereSql}
       ORDER BY starts_at ASC`, params);
        return rows.map((r) => ({
            id: r.id,
            title: r.title,
            summary: r.summary,
            startsAt: iso(r.starts_at),
            endsAt: iso(r.ends_at),
            categories: r.categories || [],
            coverUrl: r.cover_url || undefined,
            venue: { name: r.venue_name }
        }));
    });
    app.get("/events/:id", async (req, reply) => {
        const { id } = req.params;
        const { rows } = await query(`SELECT e.* , e.cover_url FROM (
        SELECT e.*, (SELECT url FROM event_images i WHERE i.event_id=e.id ORDER BY ord ASC LIMIT 1) as cover_url FROM events e
      ) e WHERE e.id=$1`, [id]);
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
            venue: { name: r.venue_name }
        };
    });
    app.post("/admin/events", { preHandler: requireOrganizerOrAdmin }, async (req) => {
        const body = baseSchema.parse(req.body);
        const id = cuid();
        const categories = body.categoriesCsv ? body.categoriesCsv.split(",").map((s) => s.trim()).filter(Boolean) : [];
        const venueName = body.venueName || '';
        const searchable = [body.title, body.summary ?? "", venueName, categories.join(" ")].join(" ").toLowerCase();
        await query(`INSERT INTO events (id,title,summary,starts_at,ends_at,venue_name,categories,searchable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [id, body.title, body.summary ?? null, body.startsAt, body.endsAt, venueName, categories, searchable]);
        return { id };
    });
    app.post("/admin/events/:id/images", { preHandler: requireOrganizerOrAdmin }, async (req, reply) => {
        const { id: eventId } = req.params;
        const imageSchema = z.object({
            url: z.string().min(1),
            width: z.number().int().positive().optional(),
            height: z.number().int().positive().optional()
        });
        const body = imageSchema.parse(req.body);
        const { rows: existing } = await query("SELECT id FROM events WHERE id=$1", [eventId]);
        if (!existing.length) {
            reply.code(404).send({ error: "Event not found" });
            return;
        }
        const imageId = cuid();
        const { rows: ordRows } = await query("SELECT COALESCE(MAX(ord), -1) as max FROM event_images WHERE event_id=$1", [eventId]);
        const nextOrd = (ordRows[0]?.max ?? -1) + 1;
        await query("INSERT INTO event_images (id, event_id, url, width, height, ord) VALUES ($1,$2,$3,$4,$5,$6)", [imageId, eventId, body.url, body.width ?? null, body.height ?? null, nextOrd]);
        return { id: imageId, url: body.url, ord: nextOrd };
    });
    app.put("/admin/events/:id", { preHandler: requireOrganizerOrAdmin }, async (req) => {
        const body = baseSchema.parse(req.body);
        const { id } = req.params;
        const categories = body.categoriesCsv ? body.categoriesCsv.split(",").map((s) => s.trim()).filter(Boolean) : [];
        const venueName = body.venueName || '';
        const searchable = [body.title, body.summary ?? "", venueName, categories.join(" ")].join(" ").toLowerCase();
        await query(`UPDATE events SET title=$2,summary=$3,starts_at=$4,ends_at=$5,venue_name=$6,categories=$7,searchable=$8,updated_at=now() WHERE id=$1`, [id, body.title, body.summary ?? null, body.startsAt, body.endsAt, venueName, categories, searchable]);
        return { id };
    });
    app.delete("/admin/events/:id", { preHandler: requireOrganizerOrAdmin }, async (req) => {
        const { id } = req.params;
        await query(`DELETE FROM events WHERE id=$1`, [id]);
        return { id };
    });
}
