import { http } from "../http"
import { authHeader } from "../http"

export async function listBookmarks() { return http<any[]>('/me/bookmarks') }
export async function addBookmark(eventId: string) { return http<{ ok: true }>(
  '/me/bookmarks', { method: 'POST', body: JSON.stringify({ eventId }) }
) }
export async function removeBookmark(eventId: string) { return http<{ ok: true }>(
  `/me/bookmarks/${eventId}`, { method: 'DELETE' }
) }

export async function uploadFile(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${(import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000/api'}/admin/uploads`, {
    method: 'POST',
    headers: { ...authHeader() },
    body: form
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ url: string }>
}

export async function search(queryStr: string) {
  const q = (queryStr || '').trim()
  if (!q) return { results: [] as any[] }
  const qs = new URLSearchParams()
  qs.set('query', q)
  return http<{ results: any[] }>(`/search?${qs.toString()}`)
}

export async function notifications(userId: string) {
  const res = await fetch(`${(import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000/api'}/notifications/user/${encodeURIComponent(userId)}`, { headers: { ...authHeader() } })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<any[]>
}
