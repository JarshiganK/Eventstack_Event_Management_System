import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import EventCard from '../components/EventCard'
import { api } from '../lib/api'
import { useDebounce } from '../lib/debounce'

type EventSummary = {
  id?: string
  title: string
  summary?: string
  startsAt: string
  endsAt?: string
  coverUrl?: string
  images?: Array<{ url: string }>
  categories?: string[]
  venue?: { name?: string; zone?: string; subzone?: string }
}

const normalize = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export default function Search() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [zone, setZone] = useState('')
  const [subzone, setSubzone] = useState('')
  const [results, setResults] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [allEvents, setAllEvents] = useState<EventSummary[]>([])

  useEffect(() => {
    api
      .listEvents()
      .then(setAllEvents)
      .catch(() => setAllEvents([]))
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    allEvents.forEach(event => {
      event.categories?.forEach(cat => {
        if (cat.trim()) set.add(cat)
      })
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [allEvents])

  const zones = useMemo(() => {
    const set = new Set<string>()
    allEvents.forEach(event => {
      if (event.venue?.zone) set.add(event.venue.zone)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [allEvents])

  const subzones = useMemo(() => {
    const set = new Set<string>()
    allEvents.forEach(event => {
      if (event.venue?.subzone) set.add(event.venue.subzone)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [allEvents])

  const run = useCallback(
    async (term: string) => {
      const trimmed = term.trim()
      if (!trimmed) {
        setResults([])
        setError('')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const res = await api.search(trimmed, {
          category: category || undefined,
          zone: zone || undefined,
          subzone: subzone || undefined,
        })
        setResults(res.results ?? [])
        setError('')
      } catch {
        setResults([])
        setError("We couldn't search right now. Please try again.")
      } finally {
        setLoading(false)
      }
    },
    [category, zone, subzone]
  )

  useDebounce(query, 320, run)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    run(query)
  }

  const onSelectChip = (value: string, setter: (v: string) => void) => {
    setter(prev => (prev === value ? '' : value))
  }

  return (
    <main className="page">
      <header className="stack sticky-top surface" aria-labelledby="search-heading">
        <span className="eyebrow">Find your vibe</span>
        <h1 id="search-heading" className="hero-title">
          Search events
        </h1>
        <p className="hero-copy">
          Filter by category, zone or subzone to pinpoint the perfect experience. Results update as you type.
        </p>
        <form className="search-panel__form" onSubmit={onSubmit}>
          <div className="search-panel__bar">
            <input
              className="search-input"
              placeholder='Try "Comedy", "Festivals", "Arena"...'
              value={query}
              onChange={event => setQuery(event.target.value)}
              aria-label="Search events"
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </div>
        </form>
        <div className="stack">
          {categories.length ? (
            <div>
              <span className="eyebrow">Categories</span>
              <div className="chips">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`chip${category === cat ? ' chip--on' : ''}`}
                    onClick={() => onSelectChip(cat, setCategory)}
                    aria-pressed={category === cat}
                  >
                    {normalize(cat)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {zones.length ? (
            <div>
              <span className="eyebrow">Zones</span>
              <div className="chips">
                {zones.map(value => (
                  <button
                    key={value}
                    type="button"
                    className={`chip${zone === value ? ' chip--on' : ''}`}
                    onClick={() => onSelectChip(value, setZone)}
                    aria-pressed={zone === value}
                  >
                    {normalize(value)}
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
                    className={`chip${subzone === value ? ' chip--on' : ''}`}
                    onClick={() => onSelectChip(value, setSubzone)}
                    aria-pressed={subzone === value}
                  >
                    {normalize(value)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <section aria-live="polite" className="stack">
        {error ? <div className="alert alert--danger">{error}</div> : null}
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
        ) : results.length ? (
          <div className="grid">
            {results.map(result => (
              <EventCard key={`${result.id ?? result.title}-${result.startsAt}`} event={result} />
            ))}
          </div>
        ) : query.trim() ? (
          <div className="empty">
            <h3>No results</h3>
            <p>We couldn&apos;t find a match. Try adjusting your filters or searching a different keyword.</p>
          </div>
        ) : (
          <div className="empty">
            <h3>Start searching</h3>
            <p>Type in the search box or tap one of the chips above to get personalised results.</p>
          </div>
        )}
      </section>
    </main>
  )
}

