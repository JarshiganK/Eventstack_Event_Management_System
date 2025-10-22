import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EventCard from '../../components/EventCard'
import { api } from '../../lib/api'
import { getHomeCategoryFiltersVisible, setHomeCategoryFiltersVisible } from '../../lib/homeFiltersVisibility'

type EventSummary = {
  id?: string
  title: string
  summary?: string
  startsAt: string
  endsAt?: string
  coverUrl?: string
  categories?: string[]
  images?: Array<{ url: string }>
  venue?: { name?: string }
}

const normalize = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export default function Dashboard() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('')
  const [homeFiltersVisible, setHomeFiltersVisible] = useState(() => getHomeCategoryFiltersVisible())

  useEffect(() => {
    setLoading(true)
    api
      .listEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'home:categoryFiltersVisible') return
      setHomeFiltersVisible(event.newValue !== 'false')
    }

    const handleEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ value?: boolean }>).detail
      if (typeof detail?.value === 'boolean') {
        setHomeFiltersVisible(detail.value)
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('homeCategoryFiltersVisibilityChanged', handleEvent as EventListener)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('homeCategoryFiltersVisibilityChanged', handleEvent as EventListener)
    }
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    events.forEach(event => event.categories?.forEach(cat => cat && set.add(cat)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [events])

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchCategory = activeCategory ? event.categories?.includes(activeCategory) : true
      return matchCategory
    })
  }, [events, activeCategory])

  const upcomingCount = useMemo(() => {
    const now = Date.now()
    return events.filter(event => {
      const start = new Date(event.startsAt).getTime()
      return !Number.isNaN(start) && start > now
    }).length
  }, [events])

  const toggle = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter(current => (current === value ? '' : value))
  }

  function toggleHomeFilters() {
    const next = !homeFiltersVisible
    setHomeCategoryFiltersVisible(next)
    setHomeFiltersVisible(next)
  }

  return (
    <main className="page admin-dashboard-page">
      <header className="stack admin-dashboard-header">
        <span className="eyebrow">Admin overview</span>
        <h1 className="hero-title">Dashboard</h1>
        <p className="hero-copy">
          Monitor listings, curate the home page and empower organizers with the controls they need.
        </p>
      </header>

      <section className="admin-summary">
        <div className="admin-summary__row">
          <div className="summary-card" role="status">
            <strong>{events.length}</strong>
            <span>Total events</span>
          </div>
          <div className="summary-card" role="status">
            <strong>{upcomingCount}</strong>
            <span>Upcoming</span>
          </div>
        </div>
      </section>

      <section className="admin-control-grid">
        <article className="surface-card admin-control-card">
          <div className="admin-control-card__header">
            <h2>Home experience</h2>
            <span className={`badge ${homeFiltersVisible ? 'badge--success' : 'badge--muted'}`}>
              {homeFiltersVisible ? 'Filters visible' : 'Filters hidden'}
            </span>
          </div>
          <p>
            Toggle the category chips on the public home page and open a preview to ensure the discovery flow looks
            right.
          </p>
          <div className="admin-control-card__actions">
            <button type="button" className="btn btn-tonal btn-sm" onClick={toggleHomeFilters}>
              {homeFiltersVisible ? 'Hide home filters' : 'Show home filters'}
            </button>
            <Link to="/" className="btn btn-ghost btn-sm">
              Preview home
            </Link>
          </div>
        </article>

        <article className="surface-card admin-control-card">
          <div className="admin-control-card__header">
            <h2>Organizer journey</h2>
            <span className="badge badge--accent">Live</span>
          </div>
          <p>
            Keep tabs on the organizer dashboard and onboarding experience. Use these shortcuts to collaborate with the
            publisher team.
          </p>
          <div className="admin-control-card__actions">
            <Link to="/organizer/dashboard" className="btn btn-primary btn-sm">
              View organizer dashboard
            </Link>
            <Link to="/organizer/login" className="btn btn-ghost btn-sm">
              Invite organizer
            </Link>
          </div>
        </article>

        <article className="surface-card admin-control-card">
          <div className="admin-control-card__header">
            <h2>Content operations</h2>
            <span className="badge badge--muted">Actions</span>
          </div>
          <p>
            Launch new events, tune venue information and keep your listings fresh with a steady cadence of updates.
          </p>
          <div className="admin-control-card__actions">
            <Link to="/admin/events/new" className="btn btn-primary btn-sm">
              Create event
            </Link>
            {/* Manage venues removed; events store venue name directly */}
          </div>
        </article>
      </section>

      <section className="surface-card admin-filters">
        <div className="admin-filters__header">
          <h2>Quick filters</h2>
          <p>Use categories to focus reviews on specific themes or event types.</p>
        </div>
        {categories.length ? (
          <div>
            <span className="eyebrow">Categories</span>
            <div className="chips">
              {categories.map(category => (
                <button
                  key={category}
                  type="button"
                  className={`chip${activeCategory === category ? ' chip--on' : ''}`}
                  onClick={() => toggle(category, setActiveCategory)}
                  aria-pressed={activeCategory === category}
                >
                  {normalize(category)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="admin-filters__empty">Add categories when creating events to unlock focused reviews.</p>
        )}
      </section>

      <section className="stack admin-event-feed" aria-live="polite">
        {loading ? (
          <div className="grid">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="skeleton-card">
                <div className="skeleton-card__media shimmer" />
                <div className="skeleton-card__line shimmer" />
                <div className="skeleton-card__line shimmer" />
              </div>
            ))}
          </div>
        ) : filteredEvents.length ? (
          <div className="grid">
            {filteredEvents.map(event => (
              <EventCard key={`${event.id ?? event.title}-${event.startsAt}`} event={event} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>No events match these filters</h3>
            <p>Clear a few chips above to widen the view.</p>
          </div>
        )}
      </section>
    </main>
  )
}
