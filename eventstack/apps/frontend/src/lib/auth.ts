import { api } from './api'

export function setToken(token: string) { localStorage.setItem('token', token) }
export function getToken(): string | null { return localStorage.getItem('token') }
export function clearToken() { localStorage.removeItem('token') }

export type KnownRole = 'ADMIN' | 'USER' | 'ORGANIZER'

export async function fetchRole(): Promise<KnownRole | null> {
  try {
    const me = await api.me()
    return me.user.role as KnownRole
  } catch {
    return null
  }
}


