import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db.js";

export default async function searchRoutes(app: FastifyInstance) {
  const qSchema = z.object({
    query: z.string().optional().default(""),
    category: z.string().optional().default("")
  });

  app.get("/search", async (req) => {
    const q = qSchema.parse(req.query);
    const search = (q.query || "").trim();
    if (!search) {
      return { results: [] };
    }

    const params: any[] = [search];
    let where = `lower(e.searchable) LIKE '%' || lower($1) || '%'`;
    if (q.category) {
      params.push(q.category);
      where += ` AND $${params.length} = ANY(e.categories)`;
    }

    const { rows } = await query(
      `SELECT e.*, v.id as venue_id, v.name as venue_name, v.lat, v.lng,
              (SELECT url FROM event_images i WHERE i.event_id=e.id ORDER BY ord ASC LIMIT 1) as cover_url
       FROM events e
       LEFT JOIN venues v ON v.id=e.venue_id
       WHERE ${where}
       ORDER BY e.starts_at ASC`,
      params
    );

    const results = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      startsAt: new Date(r.starts_at).toISOString(),
      endsAt: new Date(r.ends_at).toISOString(),
      categories: r.categories || [],
      coverUrl: r.cover_url || undefined,
      venue: { id: r.venue_id, name: r.venue_name, lat: r.lat, lng: r.lng }
    }));
    return { results };
  });
}


