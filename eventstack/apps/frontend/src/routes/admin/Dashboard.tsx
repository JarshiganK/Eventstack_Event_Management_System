import { useEffect, useMemo, useState } from 'react'
import EventCard from '../../components/EventCard'
import { api } from '../../lib/api'

type EventSummary = {
  id?: string
  title: string
  summary?: string
  startsAt: string
  endsAt?: string
  coverUrl?: string
  categories?: string[]
  images?: Array<{ url: string }>
  venue?: { name?: string; zone?: string; subzone?: string }
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
  const [activeZone, setActiveZone] = useState('')
  const [activeSubzone, setActiveSubzone] = useState('')

  useEffect(() => {
    setLoading(true)
    api
      .listEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    events.forEach(event => event.categories?.forEach(cat => cat && set.add(cat)))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [events])

  const zones = useMemo(() => {
    const set = new Set<string>()
    events.forEach(event => {
      if (event.venue?.zone) set.add(event.venue.zone)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [events])

  const subzones = useMemo(() => {
    const set = new Set<string>()
    events.forEach(event => {
      if (event.venue?.subzone) set.add(event.venue.subzone)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [events])

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchCategory = activeCategory ? event.categories?.includes(activeCategory) : true
      const matchZone = activeZone ? event.venue?.zone === activeZone : true
      const matchSubzone = activeSubzone ? event.venue?.subzone === activeSubzone : true
      return matchCategory && matchZone && matchSubzone
    })
  }, [events, activeCategory, activeZone, activeSubzone])

  const upcomingCount = useMemo(() => {
    const now = Date.now()
    return events.filter(event => {
      const start = new Date(event.startsAt).getTime()
      return !Number.isNaN(start) && start > now
    }).length
  }, [events])

  const toggle = (value: string, setter: (next: string) => void) => {
    setter(current => (current === value ? '' : value))
  }

  return (
    <main className="page stack">
      <header className="stack">
        <span className="eyebrow">Admin overview</span>
        <h1 className="hero-title">Dashboard</h1>
        <p className="hero-copy">
          Monitor listings, filter by location or category, and keep tabs on what is live right now.
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

      <section className="surface stack">
        <h2>Quick filters</h2>
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
        ) : null}
        {zones.length ? (
          <div>
            <span className="eyebrow">Zones</span>
            <div className="chips">
              {zones.map(zone => (
                <button
                  key={zone}
                  type="button"
                  className={`chip${activeZone === zone ? ' chip--on' : ''}`}
                  onClick={() => toggle(zone, setActiveZone)}
                  aria-pressed={activeZone === zone}
                >
                  {normalize(zone)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {subzones.length ? (
          <div>
            <span className="eyebrow">Subzones</span>
            <div className="chips">
              {subzones.map(value => (
                <button
                  key={value}
                  type="button"
                  className={`chip${activeSubzone === value ? ' chip--on' : ''}`}
                  onClick={() => toggle(value, setActiveSubzone)}
                  aria-pressed={activeSubzone === value}
                >
                  {normalize(value)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="stack" aria-live="polite">
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

