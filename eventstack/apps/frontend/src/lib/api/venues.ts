import { http } from "../http"

export async function listVenues() { return http<any[]>('/venues') }
export async function createVenue(v: { name: string; address?: string; lat?: number; lng?: number }) {
  return http<{ id: string }>(
    '/admin/venues', { method: 'POST', body: JSON.stringify(v) }
  )
}
export async function updateVenue(id: string, v: { name: string; address?: string; lat?: number; lng?: number }) {
  return http<{ id: string }>(
    `/admin/venues/${id}`, { method: 'PUT', body: JSON.stringify(v) }
  )
}
export async function deleteVenue(id: string) { return http<{ id: string }>(`/admin/venues/${id}`, { method: 'DELETE' }) }
