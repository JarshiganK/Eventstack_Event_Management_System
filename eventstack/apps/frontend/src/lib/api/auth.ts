import { http } from "../http"

export async function login(email: string, password: string) {
  return http<{ token: string; user: { id: string; email: string; role: string } }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) }
  )
}

export async function register(email: string, password: string, role?: 'USER' | 'ORGANIZER') {
  const body: any = { email, password }
  if (role) body.role = role
  return http<{ token: string; user: { id: string; email: string; role: string } }>(
    '/auth/register',
    { method: 'POST', body: JSON.stringify(body) }
  )
}

export async function me() {
  return http<{ user: { id: string; email: string; role: string } }>(
    '/auth/me'
  )
}
