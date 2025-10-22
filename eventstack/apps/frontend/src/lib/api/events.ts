import { http } from "../http"

export async function listEvents(params?: { from?: string; to?: string; category?: string }) {
  const qs = new URLSearchParams()
  if (params?.from) qs.set('from', params.from)
  if (params?.to) qs.set('to', params.to)
  if (params?.category) qs.set('category', params.category)
  const q = qs.toString()
  return http<any[]>(`/events${q ? `?${q}` : ''}`)
}

export async function getEvent(id: string) { return http<any>(`/events/${id}`) }

export async function createEvent(e: { title: string; summary?: string; startsAt: string; endsAt: string; venueId: string; categoriesCsv?: string }) {
  return http<{ id: string }>(
    '/admin/events', { method: 'POST', body: JSON.stringify(e) }
  )
}

export async function updateEvent(id: string, e: { title: string; summary?: string; startsAt: string; endsAt: string; venueId: string; categoriesCsv?: string }) {
  return http<{ id: string }>(
    `/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(e) }
  )
}

export async function deleteEvent(id: string) { return http<{ id: string }>(`/admin/events/${id}`, { method: 'DELETE' }) }
