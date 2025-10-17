const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:4000/api'

/**
 * Build authorization headers if a token is present.
 * Return type is a plain record so it merges cleanly with other header objects.
 */
export function authHeader(): Record<string, string> | undefined {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

/**
 * Lightweight HTTP helper used across the frontend.
 * - Ensures Content-Type is application/json by default
 * - Merges provided headers, then attaches auth header when available
 */
export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const baseHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  const initHeaders = (init?.headers as Record<string, string> | undefined) || {}
  const merged = { ...baseHeaders, ...initHeaders, ...(authHeader() || {}) }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: merged as HeadersInit
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
