import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EventCard from '../components/EventCard'
import BackLink from '../components/BackLink'
import { api } from '../lib/api'
import { getLocalBookmarks } from '../lib/storage'

type BookmarkEvent = {
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

export default function Bookmarks() {
  const [items, setItems] = useState<BookmarkEvent[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const list = await api.listBookmarks()
        setItems(list)
      } catch {
        const local = getLocalBookmarks()
        const fallback: BookmarkEvent[] = local.map(entry => ({
          id: entry.id,
          title: `Saved event ${entry.id.slice(-4)}`,
          startsAt: new Date().toISOString(),
        }))
        setItems(fallback)
      }
    })()
  }, [])

  return (
    <main className="page stack">
      <BackLink className="mb-4" />
      <header className="bookmark-header">
        <span className="eyebrow">Your shortlist</span>
        <h1 className="hero-title">Saved events</h1>
        <p className="hero-copy">Pick up where you left off and book the plans you&apos;re excited about.</p>
      </header>

      {items.length ? (
        <div className="grid">
          {items.map(event => (
            <EventCard key={`${event.id ?? event.title}-${event.startsAt}`} event={event} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>No bookmarks yet</h3>
          <p>Tap the bookmark button on any event to save it for later.</p>
          <Link to="/?search=1#home-search" className="btn btn-primary">
            Discover events
          </Link>
        </div>
      )}
    </main>
  )
}


