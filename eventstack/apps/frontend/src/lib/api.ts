const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000/api'

function authHeader() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      ...authHeader()
    }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  // auth
  async login(email: string, password: string) {
    return http<{ token: string; user: { id: string; email: string; role: string } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) }
    )
  },
  async register(email: string, password: string, role?: 'USER' | 'ORGANIZER', signupCode?: string) {
    const body: any = { email, password }
    if (role) body.role = role
    if (signupCode) body.signupCode = signupCode
    return http<{ token: string; user: { id: string; email: string; role: string } }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify(body) }
    )
  },
  async me() {
    return http<{ user: { id: string; email: string; role: string } }>(
      '/auth/me'
    )
  },

  // venues
  async listVenues() { return http<any[]>('/venues') },
  async createVenue(v: { name: string; address?: string; lat: number; lng: number; zone?: string; subzone?: string }) {
    return http<{ id: string }>(
      '/admin/venues', { method: 'POST', body: JSON.stringify(v) }
    )
  },
  async updateVenue(id: string, v: { name: string; address?: string; lat: number; lng: number; zone?: string; subzone?: string }) {
    return http<{ id: string }>(
      `/admin/venues/${id}`, { method: 'PUT', body: JSON.stringify(v) }
    )
  },
  async deleteVenue(id: string) { return http<{ id: string }>(`/admin/venues/${id}`, { method: 'DELETE' }) },

  // events
  async listEvents(params?: { from?: string; to?: string; category?: string; zone?: string; subzone?: string }) {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to) qs.set('to', params.to)
    if (params?.category) qs.set('category', params.category)
    if (params?.zone) qs.set('zone', params.zone)
    if (params?.subzone) qs.set('subzone', params.subzone)
    const q = qs.toString()
    return http<any[]>(`/events${q ? `?${q}` : ''}`)
  },
  async getEvent(id: string) { return http<any>(`/events/${id}`) },
  async createEvent(e: { title: string; summary?: string; startsAt: string; endsAt: string; venueId: string; categoriesCsv?: string }) {
    return http<{ id: string }>(
      '/admin/events', { method: 'POST', body: JSON.stringify(e) }
    )
  },
  async updateEvent(id: string, e: { title: string; summary?: string; startsAt: string; endsAt: string; venueId: string; categoriesCsv?: string }) {
    return http<{ id: string }>(
      `/admin/events/${id}`, { method: 'PUT', body: JSON.stringify(e) }
    )
  },
  async deleteEvent(id: string) { return http<{ id: string }>(`/admin/events/${id}`, { method: 'DELETE' }) },

  // bookmarks
  async listBookmarks() { return http<any[]>('/me/bookmarks') },
  async addBookmark(eventId: string) { return http<{ ok: true }>(
    '/me/bookmarks', { method: 'POST', body: JSON.stringify({ eventId }) }
  ) },
  async removeBookmark(eventId: string) { return http<{ ok: true }>(
    `/me/bookmarks/${eventId}`, { method: 'DELETE' }
  ) },

  // uploads
  async uploadFile(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_BASE}/admin/uploads`, {
      method: 'POST',
      headers: { ...authHeader() },
      body: form
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json() as Promise<{ url: string }>
  },

  // EXACT search API behavior
  async search(queryStr: string, filters?: { category?: string; zone?: string; subzone?: string }) {
    const q = (queryStr || '').trim()
    if (!q) return { results: [] as any[] }
    const qs = new URLSearchParams()
    qs.set('query', q)
    if (filters?.category) qs.set('category', filters.category)
    if (filters?.zone) qs.set('zone', filters.zone)
    if (filters?.subzone) qs.set('subzone', filters.subzone)
    return http<{ results: any[] }>(`/search?${qs.toString()}`)
  },

  // EXACT notifications API (plain array)
  async notifications(userId: string) {
    const res = await fetch(`${API_BASE}/notifications/user/${encodeURIComponent(userId)}`, { headers: { ...authHeader() } })
    if (!res.ok) throw new Error(await res.text())
    return res.json() as Promise<any[]>
  }
}

