/**
 * Bookmark routes module
 * Handles all HTTP endpoints related to user bookmarks, including:
 * - Retrieving a user's bookmarked events
 * - Adding events to user's bookmarks
 * - Removing events from user's bookmarks
 * All endpoints require user authentication
 */
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db.js";
import { cuid } from "../utils.js";
import { requireUser } from "../auth.js";

/**
 * Registers all bookmark-related routes with the Fastify app instance
 * @param app - Fastify application instance
 */
export default async function bookmarkRoutes(app: FastifyInstance) {
  /**
   * Schema for validating bookmark creation requests
   * Requires an eventId field to identify which event to bookmark
   */
  const addSchema = z.object({ eventId: z.string() });

  /**
   * GET /me/bookmarks
   * Retrieves all bookmarked events for the authenticated user
   * Returns events in reverse chronological order (most recently bookmarked first)
   * Includes event details and the first cover image URL
   * @returns Array of event objects with id, title, summary, dates, coverUrl, and venue
   */
  app.get("/me/bookmarks", { preHandler: requireUser }, async (req) => {
    const user = (req as any).user as { id: string };
    // Query joins bookmarks with events to get full event details
    // Gets the first cover image ordered by display order
    const { rows } = await query(
      `SELECT b.event_id as id, e.title, e.summary, e.starts_at, e.ends_at,
              (SELECT url FROM event_images i WHERE i.event_id=e.id ORDER BY ord ASC LIMIT 1) as cover_url,
              e.venue_name
       FROM bookmarks b
       JOIN events e ON e.id=b.event_id
       WHERE b.user_id=$1
       ORDER BY b.created_at DESC`,
      [user.id]
    );
    // Transform database rows to API response format with ISO date strings
    return rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      startsAt: new Date(r.starts_at).toISOString(),
      endsAt: new Date(r.ends_at).toISOString(),
      coverUrl: r.cover_url || undefined,
      venue: { id: undefined as any, name: r.venue_name }
    }));
  });

  /**
   * POST /me/bookmarks
   * Adds an event to the authenticated user's bookmarks
   * If the event is already bookmarked, the request silently succeeds (idempotent)
   * @param body.eventId - The ID of the event to bookmark
   * @returns 201 status with success confirmation
   */
  app.post("/me/bookmarks", { preHandler: requireUser }, async (req, reply) => {
    const body = addSchema.parse(req.body);
    const user = (req as any).user as { id: string };
    try {
      // Create a new bookmark with a generated CUID
      await query(
        `INSERT INTO bookmarks (id, user_id, event_id) VALUES ($1,$2,$3)`,
        [cuid(), user.id, body.eventId]
      );
    } catch (e: any) {
      // If bookmark already exists (duplicate key), silently ignore the error
      // This makes the endpoint idempotent - calling it multiple times is safe
    }
    reply.code(201).send({ ok: true });
  });

  /**
   * DELETE /me/bookmarks/:eventId
   * Removes an event from the authenticated user's bookmarks
   * @param eventId - The ID of the event to remove from bookmarks (URL parameter)
   * @returns Success confirmation object
   */
  app.delete<{ Params: { eventId: string } }>("/me/bookmarks/:eventId", { preHandler: requireUser }, async (req) => {
    const user = (req as any).user as { id: string };
    // Delete the bookmark matching both user and event IDs
    await query(`DELETE FROM bookmarks WHERE user_id=$1 AND event_id=$2`, [user.id, req.params.eventId]);
    return { ok: true };
  });
}


