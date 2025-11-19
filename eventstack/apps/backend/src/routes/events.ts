/**
 * Event routes module
 * Handles all HTTP endpoints related to events, including:
 * - Retrieving event lists with filtering capabilities
 * - Getting individual event details with images
 * - Creating, updating, and deleting events (admin/organizer only)
 * - Managing event images (admin/organizer only)
 */
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db.js";
import { cuid, iso } from "../utils.js";
import { requireOrganizerOrAdmin } from "../auth.js";

/**
 * Registers all event-related routes with the Fastify app instance
 * @param app - Fastify application instance
 */
export default async function eventRoutes(app: FastifyInstance) {
  /**
   * Base schema for event creation and updates
   * Validates common fields required for event operations
   */
  const baseSchema = z.object({
    title: z.string().min(1),
    summary: z.string().optional().nullable(),
    startsAt: z.string(),
    endsAt: z.string(),
    venueName: z.string().optional().nullable(),
    categoriesCsv: z.string().optional().default("")
  });

  /**
   * GET /events
   * Retrieves a list of events with optional filtering
   * Query parameters:
   *   - from: Filter events starting from this date (ISO string)
   *   - to: Filter events ending before this date (ISO string)
   *   - category: Filter events by category name
   * @returns Array of event objects with cover image URL
   */
  app.get("/events", async (req) => {
    // Extract and parse query parameters for filtering
    const q = (req.query || {}) as Record<string, string | undefined>;
    const where: string[] = [];
    const params: any[] = [];
    
    // Build WHERE clause dynamically based on query parameters
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
      // Use PostgreSQL ANY() operator to check if category exists in categories array
      where.push(`$${params.length} = ANY(categories)`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    
    // Fetch events with their cover image (first image ordered by ord)
    const { rows } = await query(
      `SELECT e.*,
              (SELECT url FROM event_images i WHERE i.event_id=e.id ORDER BY ord ASC LIMIT 1) as cover_url
       FROM events e
       ${whereSql}
       ORDER BY starts_at ASC`,
      params
    );
    
    // Transform database rows to API response format
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      startsAt: iso(r.starts_at), // Convert PostgreSQL timestamp to ISO string
      endsAt: iso(r.ends_at),
      categories: r.categories || [],
      coverUrl: r.cover_url || undefined,
      venue: { name: r.venue_name }
    }));
  });

  /**
   * GET /events/:id
   * Retrieves detailed information about a specific event
   * Includes all event images ordered by their display order
   * @param id - Event ID from URL parameter
   * @returns Event object with all images, or 404 if not found
   */
  app.get<{ Params: { id: string } }>("/events/:id", async (req, reply) => {
    const { id } = req.params;
    
    // Fetch event with cover image (first image)
    const { rows } = await query(
      `SELECT e.* , e.cover_url FROM (
        SELECT e.*, (SELECT url FROM event_images i WHERE i.event_id=e.id ORDER BY ord ASC LIMIT 1) as cover_url FROM events e
      ) e WHERE e.id=$1`,
      [id]
    );
    const r = rows[0];
    if (!r) {
      reply.code(404).send({ error: "Not found" });
      return;
    }
    
    // Fetch all images for this event, ordered by display order
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

  /**
   * POST /admin/events
   * Creates a new event (admin/organizer only)
   * Requires authentication with organizer or admin role
   * @param body - Event data validated against baseSchema
   * @returns Object with the created event ID
   */
  app.post("/admin/events", { preHandler: requireOrganizerOrAdmin }, async (req) => {
    const body = baseSchema.parse(req.body);
    const id = cuid(); // Generate unique ID for the event
    
    // Parse comma-separated categories into array, trimming whitespace
    const categories = body.categoriesCsv ? body.categoriesCsv.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const venueName = body.venueName || '';
    
    // Create searchable text by combining all searchable fields (for full-text search)
    const searchable = [body.title, body.summary ?? "", venueName, categories.join(" ")].join(" ").toLowerCase();
    
    await query(
      `INSERT INTO events (id,title,summary,starts_at,ends_at,venue_name,categories,searchable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, body.title, body.summary ?? null, body.startsAt, body.endsAt, venueName, categories, searchable]
    );
    return { id };
  });

  /**
   * POST /admin/events/:id/images
   * Adds an image to an event (admin/organizer only)
   * Images are automatically ordered based on existing images
   * @param id - Event ID from URL parameter
   * @param body - Image data (url, optional width/height)
   * @returns Object with image ID, URL, and display order
   */
  app.post<{ Params: { id: string } }>("/admin/events/:id/images", { preHandler: requireOrganizerOrAdmin }, async (req, reply) => {
    const { id: eventId } = req.params;
    
    // Schema for image validation
    const imageSchema = z.object({
      url: z.string().min(1),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional()
    });
    const body = imageSchema.parse(req.body);

    // Verify that the event exists
    const { rows: existing } = await query("SELECT id FROM events WHERE id=$1", [eventId]);
    if (!existing.length) {
      reply.code(404).send({ error: "Event not found" });
      return;
    }

    const imageId = cuid();
    
    // Get the maximum order value for existing images, defaulting to -1 if none exist
    // This ensures the new image is appended to the end
    const { rows: ordRows } = await query<{ max: number }>("SELECT COALESCE(MAX(ord), -1) as max FROM event_images WHERE event_id=$1", [eventId]);
    const nextOrd = (ordRows[0]?.max ?? -1) + 1;

    await query(
      "INSERT INTO event_images (id, event_id, url, width, height, ord) VALUES ($1,$2,$3,$4,$5,$6)",
      [imageId, eventId, body.url, body.width ?? null, body.height ?? null, nextOrd]
    );

    return { id: imageId, url: body.url, ord: nextOrd };
  });

  /**
   * PUT /admin/events/:id
   * Updates an existing event (admin/organizer only)
   * Updates the updated_at timestamp automatically
   * @param id - Event ID from URL parameter
   * @param body - Event data validated against baseSchema
   * @returns Object with the updated event ID
   */
  app.put<{ Params: { id: string } }>("/admin/events/:id", { preHandler: requireOrganizerOrAdmin }, async (req) => {
    const body = baseSchema.parse(req.body);
    const { id } = req.params;
    
    // Parse comma-separated categories into array, trimming whitespace
    const categories = body.categoriesCsv ? body.categoriesCsv.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const venueName = body.venueName || '';
    
    // Update searchable text by combining all searchable fields
    const searchable = [body.title, body.summary ?? "", venueName, categories.join(" ")].join(" ").toLowerCase();
    
    await query(
      `UPDATE events SET title=$2,summary=$3,starts_at=$4,ends_at=$5,venue_name=$6,categories=$7,searchable=$8,updated_at=now() WHERE id=$1`,
      [id, body.title, body.summary ?? null, body.startsAt, body.endsAt, venueName, categories, searchable]
    );
    return { id };
  });

  /**
   * DELETE /admin/events/:id
   * Deletes an event (admin/organizer only)
   * Cascades to delete associated images and other related data
   * @param id - Event ID from URL parameter
   * @returns Object with the deleted event ID
   */
  app.delete<{ Params: { id: string } }>("/admin/events/:id", { preHandler: requireOrganizerOrAdmin }, async (req) => {
    const { id } = req.params;
    await query(`DELETE FROM events WHERE id=$1`, [id]);
    return { id };
  });
}


