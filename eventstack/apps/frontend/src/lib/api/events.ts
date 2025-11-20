/**
 * Events API client module
 * Provides functions to interact with the events API endpoints
 */
import { http } from "../http"

/**
 * Retrieves a list of events with optional filtering
 * @param params - Optional filter parameters
 * @param params.from - Filter events starting from this date (ISO string)
 * @param params.to - Filter events ending before this date (ISO string)
 * @param params.category - Filter events by category name
 * @returns Promise resolving to an array of event objects
 */
export async function listEvents(params?: { from?: string; to?: string; category?: string }) {
  const qs = new URLSearchParams()
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  if (params?.category) qs.set('category', params.category)
  const q = qs.toString()
  return http<any[]>(`/events${q ? `?${q}` : ''}`)
}

/**
 * Retrieves detailed information about a specific event
 * @param id - Event ID
 * @returns Promise resolving to an event object with all images
 */
export async function getEvent(id: string) { return http<any>(`/events/${id}`) }

/**
 * Creates a new event (admin/organizer only)
 * Requires authentication with organizer or admin role
 * @param e - Event data object
 * @param e.title - Event title (required)
 * @param e.summary - Event summary (optional)
 * @param e.startsAt - Event start date/time (ISO string)
 * @param e.endsAt - Event end date/time (ISO string)
 * @param e.venueName - Venue name (optional)
 * @param e.categoriesCsv - Comma-separated list of categories (optional)
 * @returns Promise resolving to an object with the created event ID
 */
export async function createEvent(e: { title: string; summary?: string; startsAt: string; endsAt: string; venueName?: string; categoriesCsv?: string }) {
  return http<{ id: string }>(
    '/admin/events', { method: 'POST', body: JSON.stringify(e) }
  )
}

/**
 * Updates an existing event (admin/organizer only)
 * Requires authentication with organizer or admin role
 * @param id - Event ID to update
 * @param e - Event data object with fields to update
 * @returns Promise resolving to an object with the updated event ID
 */
export async function updateEvent(id: string, e: { title: string; summary?: string; startsAt: string; endsAt: string; venueName?: string; categoriesCsv?: string }) {
  return http<{ id: string }>(
    `/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(e) }
  )
}

/**
 * Deletes an event (admin/organizer only)
 * Requires authentication with organizer or admin role
 * @param id - Event ID to delete
 * @returns Promise resolving to an object with the deleted event ID
 */
export async function deleteEvent(id: string) { return http<{ id: string }>(`/admin/events/${id}`, { method: 'DELETE' }) }

/**
 * Adds an image to an event (admin/organizer only)
 * Requires authentication with organizer or admin role
 * Images are automatically ordered based on existing images
 * @param id - Event ID
 * @param image - Image data object
 * @param image.url - Image URL (required)
 * @param image.width - Image width in pixels (optional)
 * @param image.height - Image height in pixels (optional)
 * @returns Promise resolving to an object with image ID, URL, and display order
 */
export async function addEventImage(id: string, image: { url: string; width?: number; height?: number }) {
  return http<{ id: string; url: string; ord: number }>(
    `/admin/events/${id}/images`,
    { method: 'POST', body: JSON.stringify(image) }
  )
}
