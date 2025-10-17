import { FormEvent, useState } from 'react'
import BackLink from '../components/BackLink'
import { api } from '../lib/api'

type Notification = {
  id: string
  title: string
  body: string
  created_at: string
  read_flag?: boolean
}

export default function Notifications() {
  const [userId, setUserId] = useState('')
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const trimmed = userId.trim()
    if (!trimmed) {
      setItems([])
      setError('')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await api.notifications(trimmed)
      const sorted = [...res].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setItems(sorted)
    } catch {
      setItems([])
      setError('Unable to load notifications right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void load()
  }

  return (
    <main className="page stack">
      <BackLink className="mb-4" />
      <header className="notifications-header">
        <span className="eyebrow">Stay in the loop</span>
        <h1 className="hero-title">Notifications</h1>
        <p className="hero-copy">Pull the latest alerts for a user to track bookings, reminders and announcements.</p>
      </header>

      <section className="surface">
        <form className="search-panel__form" onSubmit={submit}>
          <div className="search-panel__bar">
            <input
              className="search-input"
              placeholder="Enter the user ID"
              value={userId}
              onChange={event => setUserId(event.target.value)}
              aria-label="User ID"
            />
            <button type="submit" className="btn btn-primary">
              Fetch alerts
            </button>
          </div>
        </form>
        {error ? <div className="alert alert--danger mt-4">{error}</div> : null}
      </section>

      <section aria-live="polite" className="notification-list">
        {loading ? (
          <div className="grid">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="skeleton-card">
                <div className="skeleton-card__line shimmer" />
                <div className="skeleton-card__line shimmer" />
              </div>
            ))}
          </div>
        ) : items.length ? (
          items.map(notification => (
            <article key={notification.id} className="surface notification-card">
              <div className="notification-meta">
                <span className="badge-dot" aria-hidden="true" />
                <span>{new Date(notification.created_at).toLocaleString()}</span>
              </div>
              <h3>{notification.title}</h3>
              <p>{notification.body}</p>
            </article>
          ))
        ) : (
          <div className="empty">
            <h3>No notifications yet</h3>
            <p>Enter a user ID above to view their latest booking updates and reminders.</p>
          </div>
        )}
      </section>
    </main>
  )
}


