import { http } from "../http"

export type AnalyticsData = {
  totalEvents: number
  totalUsers: number
  activeEvents: number
  upcomingEvents: number
  categoriesDistribution: Array<{ category: string; count: number }>
}

export async function getAnalytics(): Promise<AnalyticsData> {
  return http("/admin/analytics")
}

export type AdminUser = {
  id: string
  email: string
  role: 'ADMIN' | 'USER' | 'ORGANIZER'
  status?: 'ACTIVE' | 'SUSPENDED'
  created_at?: string
}

export async function listUsers(opts?: { role?: 'ADMIN' | 'USER' | 'ORGANIZER' }): Promise<AdminUser[]> {
  const search = new URLSearchParams()
  if (opts?.role) search.set('role', opts.role)
  const qs = search.toString() ? `?${search.toString()}` : ''
  return http(`/admin/users${qs}`)
}

export async function listOrganizers(): Promise<AdminUser[]> {
  return listUsers({ role: 'ORGANIZER' })
}

export async function updateUserRole(id: string, role: 'ADMIN' | 'USER' | 'ORGANIZER') {
  return http(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
}

export async function updateUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
  return http(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export async function deleteUser(id: string) {
  return http(`/admin/users/${id}`, { method: 'DELETE' })
}
