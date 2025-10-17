import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BackLink from '../../components/BackLink'
import { api } from '../../lib/api'

type EventSummary = {
  id: string
  title: string
  startsAt: string
  categories?: string[]
  venue?: { name: string }
}

const ALL_FILTER = 'ALL'

function formatCategoryLabel(category: string) {
  return category
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function OrganizerDashboard() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalEvents: 0, upcoming: 0 })
  const [activeFilter, setActiveFilter] = useState<string>(ALL_FILTER)

  async function load() {
    setLoading(true)
    try {
      const list = await api.listEvents()
      setEvents(list)
      const now = new Date().toISOString()
      setStats({
        totalEvents: list.length,
        upcoming: list.filter((event: EventSummary) => event.startsAt > now).length,
      })
    } catch {
      setEvents([])
      setStats({ totalEvents: 0, upcoming: 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    events.forEach(event => {
      event.categories?.forEach(category => {
        if (category.trim()) set.add(category)
      })
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [events])

  const filteredEvents = useMemo(() => {
    if (activeFilter === ALL_FILTER) return events
    return events.filter(event => event.categories?.some(category => category === activeFilter))
  }, [activeFilter, events])

  const filteredUpcoming = useMemo(() => {
    const now = new Date().toISOString()
    return filteredEvents.filter(event => event.startsAt > now).length
  }, [filteredEvents])

  async function remove(id: string) {
    if (!confirm('Delete this event?')) return
    await api.deleteEvent(id)
    await load()
  }

  return (
    <div className="page dashboard-page">
      <BackLink className="mb-4" />

      <section className="dashboard-hero surface-card">
        <div>
          <span className="page-eyebrow">Organizer control center</span>
          <h1>Dashboard</h1>
          <p>Monitor performance, fine-tune listings and launch new experiences in a click.</p>
        </div>
        <Link to="/admin/events/new" className="btn btn-primary btn-lg">
          Create event
        </Link>
      </section>

      <section className="dashboard-stats">
        <article className="stat-tile">
          <span className="stat-tile__label">Total events</span>
          <span className="stat-tile__value">{stats.totalEvents}</span>
        </article>
        <article className="stat-tile">
          <span className="stat-tile__label">
            {activeFilter === ALL_FILTER ? 'Upcoming this week' : `Upcoming in ${formatCategoryLabel(activeFilter)}`}
          </span>
          <span className="stat-tile__value">
            {activeFilter === ALL_FILTER ? stats.upcoming : filteredUpcoming}
          </span>
        </article>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <h2>Your events</h2>
          <button type="button" className="btn btn-ghost" onClick={() => void load()}>
            Refresh
          </button>
        </div>

        {availableCategories.length ? (
          <div className="dashboard-filters surface-card">
            <div className="dashboard-filters__header">
              <span>Filter by category</span>
              <span className="dashboard-filters__tagline">
                Showing {filteredEvents.length} of {events.length} listings
              </span>
            </div>
            <div className="chip-row chip-row--wrap">
              <button
                type="button"
                className={`chip${activeFilter === ALL_FILTER ? ' chip--active' : ''}`}
                onClick={() => setActiveFilter(ALL_FILTER)}
              >
                All events
              </button>
              {availableCategories.map(category => (
                <button
                  key={category}
                  type="button"
                  className={`chip${activeFilter === category ? ' chip--active' : ''}`}
                  onClick={() => setActiveFilter(category)}
                >
                  {formatCategoryLabel(category)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="loading loading-inline">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="empty-state">
            <h3>No events found</h3>
            <p>
              {activeFilter === ALL_FILTER
                ? 'Create your first listing to start tracking performance.'
                : `No events tagged ${formatCategoryLabel(activeFilter)} yet. Try another filter or add a new experience.`}
            </p>
            <Link to="/admin/events/new" className="btn btn-primary btn-lg">
              Add an event
            </Link>
          </div>
        ) : (
          <div className="dashboard-event-list">
            {filteredEvents.map(event => {
              const startDate = new Date(event.startsAt)
              const dateDisplay = Number.isNaN(startDate.getTime())
                ? 'Date to be announced'
                : startDate.toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

              return (
                <article key={event.id} className="dashboard-event-card">
                  <div>
                    <h3>{event.title}</h3>
                    <p>
                      {dateDisplay}
                      {event.venue?.name ? ` - ${event.venue.name}` : ''}
                    </p>
                    {event.categories?.length ? (
                      <div className="event-tag-row">
                        {event.categories.map(category => (
                          <span key={category} className="event-tag">
                            {formatCategoryLabel(category)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="dashboard-event-card__actions">
                    <Link to={`/admin/events/${event.id}/edit`} className="btn btn-ghost btn-sm">
                      Edit
                    </Link>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(event.id)}>
                      Delete
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
