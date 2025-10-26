import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BackLink from '../components/BackLink'
import { api } from '../lib/api'
import { clearToken } from '../lib/auth'

type ProfileUser = {
  id: string
  email: string
  role: string
}

type ProfileState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; user: ProfileUser }

function parseError(err: unknown) {
  if (err instanceof Error && err.message) {
    try {
      const parsed = JSON.parse(err.message)
      if (parsed?.error) return String(parsed.error)
      if (parsed?.message) return String(parsed.message)
    } catch {
      if (err.message.trim().length) return err.message
    }
  }
  if (typeof err === 'string' && err.trim().length) return err
  return 'Something went wrong while loading your profile.'
}

function formatRole(role: string) {
  switch (role) {
    case 'ADMIN':
      return 'Administrator'
    case 'ORGANIZER':
      return 'Organizer'
    case 'USER':
      return 'Member'
    default:
      return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
  }
}

export default function Profile() {
  const [state, setState] = useState<ProfileState>({ status: 'loading' })
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await api.me()
        if (!active) return
        setState({ status: 'loaded', user: res.user })
      } catch (err) {
        if (!active) return
        const message = parseError(err)
        if (/unauthorized/i.test(message) || /token/i.test(message)) {
          setState({ status: 'guest' })
          return
        }
        setState({ status: 'error', message })
      }
    })()

    return () => {
      active = false
    }
  }, [])

  function signOut() {
    clearToken()
    navigate('/login', { replace: true })
  }

  return (
    <div className="page profile-page">
      <BackLink className="mb-4" />

      <section className="profile-header">
        <span className="page-eyebrow">Your account</span>
        <h1>Profile</h1>
        <p>Manage your account details, access role-based dashboards and contact support.</p>
      </section>

      {state.status === 'loading' ? (
        <div className="loading loading-inline" role="status" aria-live="polite">
          Checking your profile…
        </div>
      ) : null}

      {state.status === 'guest' ? (
        <section className="surface-card profile-card">
          <h2>You are not signed in</h2>
          <p>Sign in to sync your bookmarks, notifications and organizer tools.</p>
          <div className="profile-actions">
            <Link to="/login" className="btn btn-primary btn-lg">
              Sign in
            </Link>
            <Link to="/organizer/login" className="btn btn-ghost btn-lg">
              Organizer access
            </Link>
          </div>
        </section>
      ) : null}

      {state.status === 'error' ? (
        <section className="surface-card profile-card" role="alert">
          <h2>We couldn’t load your profile</h2>
          <p>{state.message}</p>
          <div className="profile-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        </section>
      ) : null}

      {state.status === 'loaded' ? (
        <>
          <section className="surface-card profile-card">
            <div className="profile-summary">
              <h2>{state.user.email}</h2>
              <span className="profile-badge">{formatRole(state.user.role)}</span>
            </div>
            <dl className="profile-meta">
              <div>
                <dt>Account ID</dt>
                <dd>{state.user.id}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{formatRole(state.user.role)}</dd>
              </div>
            </dl>
            <div className="profile-actions">
              {(state.user.role === 'ORGANIZER' || state.user.role === 'ADMIN') && (
                <Link to="/organizer/dashboard" className="btn btn-primary btn-lg">
                  Organizer dashboard
                </Link>
              )}
              {state.user.role === 'ADMIN' ? (
                <Link to="/admin/dashboard" className="btn btn-outline btn-lg">
                  Admin console
                </Link>
              ) : null}
              <button type="button" className="btn btn-ghost btn-lg" onClick={signOut}>
                Sign out
              </button>
            </div>
          </section>

          <section className="surface-card profile-support">
            <h3>Need to update your details?</h3>
            <p>Contact our support team to change your email, adjust roles or report a security concern.</p>
            <a
              className="btn btn-tonal btn-sm"
              href="mailto:support@eventstack.app?subject=EventStack%20profile%20support"
            >
              Email support
            </a>
          </section>
        </>
      ) : null}
    </div>
  )
}
