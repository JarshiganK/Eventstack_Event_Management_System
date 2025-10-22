import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EventCard from '../components/EventCard'
import { api } from '../lib/api'
import { useDebounce } from '../lib/debounce'
import { HOME_CATEGORY_FILTERS_VISIBILITY, getHomeCategoryFiltersVisible } from '../lib/homeFiltersVisibility'

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

const HOME_SEARCH_ID = 'home-search'
const ALL = 'ALL'

const normalizeCategory = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export default function Home() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>(ALL)
  const [showCategoryFilters, setShowCategoryFilters] = useState(() => getHomeCategoryFiltersVisible())

  const [searchParams, setSearchParams] = useSearchParams()
  const [searchValue, setSearchValue] = useState('')
  const [searchCategory, setSearchCategory] = useState('')
  const [searchZone, setSearchZone] = useState('')
  const [searchSubzone, setSearchSubzone] = useState('')
  const [searchResults, setSearchResults] = useState<EventSummary[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  const searchInputRef = useRef<HTMLInputElement>(null)

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
    events.forEach(event => {
      event.categories?.forEach(category => {
        if (category.trim()) set.add(category)
      })
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [events])

  const filteredEvents = useMemo(() => {
    if (activeCategory === ALL) return events
    return events.filter(event => event.categories?.includes(activeCategory))
  }, [activeCategory, events])

  const stats = useMemo(() => {
    const now = Date.now()
    const total = filteredEvents.length
    const upcoming = filteredEvents.filter(event => {
      const start = new Date(event.startsAt).getTime()
      return !Number.isNaN(start) && start > now
    }).length
    return { total, upcoming }
  }, [filteredEvents])

  const runSearch = useCallback(
    async (query: string) => {
      const term = query.trim()
      if (!term) {
        setSearchResults([])
        setSearchError('')
        setSearchLoading(false)
        return
      }

      setSearchLoading(true)
      try {
        const res = await api.search(term, {
          category: searchCategory.trim() || undefined,
          zone: searchZone.trim() || undefined,
          subzone: searchSubzone.trim() || undefined,
        })
        setSearchResults(res.results ?? [])
        setSearchError('')
      } catch {
        setSearchResults([])
        setSearchError("We couldn't search right now. Please try again.")
      } finally {
        setSearchLoading(false)
      }
    },
    [searchCategory, searchZone, searchSubzone]
  )

  useDebounce(searchValue, 320, runSearch)

  useEffect(() => {
    if (searchParams.has('search')) {
      searchInputRef.current?.focus({ preventScroll: true })
      document.getElementById(HOME_SEARCH_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [searchParams])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleVisibilityEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ value?: boolean }>).detail
      if (typeof detail?.value === 'boolean') {
        setShowCategoryFilters(detail.value)
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== HOME_CATEGORY_FILTERS_VISIBILITY.STORAGE_KEY) return
      setShowCategoryFilters(event.newValue !== 'false')
    }

    window.addEventListener(HOME_CATEGORY_FILTERS_VISIBILITY.EVENT, handleVisibilityEvent)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(HOME_CATEGORY_FILTERS_VISIBILITY.EVENT, handleVisibilityEvent)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  useEffect(() => {
    if (!showCategoryFilters) {
      setActiveCategory(ALL)
    }
  }, [showCategoryFilters])

  const handleSubmitSearch = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      runSearch(searchValue)
      setSearchParams(params => {
        const next = new URLSearchParams(params)
        if (searchValue.trim()) {
          next.set('search', '1')
        } else {
          next.delete('search')
        }
        return next
      })
    },
    [runSearch, searchValue, setSearchParams]
  )

  const showSearchState =
    Boolean(searchValue.trim()) || searchLoading || Boolean(searchResults.length) || Boolean(searchError)

  return (
    <main className="page">
      <section className="hero" aria-labelledby="home-hero-title">
        <div className="stack">
          <span className="eyebrow">Feel the energy</span>
          <h1 id="home-hero-title" className="hero-title">
            Discover and book experiences you&#39;ll love
          </h1>
          <p className="hero-copy">
            Concerts, comedy, workshops and sports curated for every mood. Browse by vibe or search for something
            specific.
          </p>
          <div className="row" role="status" aria-live="polite" aria-label="Live listing stats">
            <strong>{stats.total}</strong>
            <span className="meta-row">live events</span>
            <strong>{stats.upcoming}</strong>
            <span className="meta-row">happening soon</span>
          </div>
          <div className="btn-group" role="group" aria-label="Key actions">
            <Link to="/organizer/login" className="btn btn-primary">
              List your event
            </Link>
            <Link to="/admin/login" className="btn btn-outline">
              Admin access
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="category-heading" className="surface">
        <div className="section-heading">
          <h2 id="category-heading">Browse by vibe</h2>
        </div>
        {showCategoryFilters ? (
          <div id="home-category-filters" className="chips" role="tablist" aria-label="Filter by category">
            <button
              type="button"
              className={`chip${activeCategory === ALL ? ' chip--on' : ''}`}
              onClick={() => setActiveCategory(ALL)}
              aria-pressed={activeCategory === ALL}
            >
              All vibes
            </button>
            {categories.map(category => (
              <button
                key={category}
                type="button"
                className={`chip${activeCategory === category ? ' chip--on' : ''}`}
                onClick={() => setActiveCategory(category)}
                aria-pressed={activeCategory === category}
              >
                {normalizeCategory(category)}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section id={HOME_SEARCH_ID} className="surface" aria-labelledby="home-search-title">
        <div className="section-heading">
          <h2 id="home-search-title">Find your next plan</h2>
        </div>
        <div className="search-panel">
          <form className="search-panel__form" onSubmit={handleSubmitSearch}>
            <div className="search-panel__bar">
              <input
                ref={searchInputRef}
                className="search-input"
                placeholder="Search by artist, venue or vibe"
                value={searchValue}
                onChange={event => setSearchValue(event.target.value)}
                aria-label="Search events"
              />
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </div>
            <div className="search-panel__filters">
              <label className="field">
                <span>Category</span>
                <input
                  className="form-input"
                  placeholder="Eg. Comedy"
                  value={searchCategory}
                  onChange={event => setSearchCategory(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Zone</span>
                <input
                  className="form-input"
                  placeholder="Eg. Downtown"
                  value={searchZone}
                  onChange={event => setSearchZone(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Subzone</span>
                <input
                  className="form-input"
                  placeholder="Eg. Riverside"
                  value={searchSubzone}
                  onChange={event => setSearchSubzone(event.target.value)}
                />
              </label>
            </div>
          </form>
          {searchError ? <div className="alert alert--danger">{searchError}</div> : null}
        </div>

        {showSearchState ? (
          <div className="stack" aria-live="polite">
            {searchLoading ? (
              <div className="grid">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="skeleton-card">
                    <div className="skeleton-card__media shimmer" />
                    <div className="skeleton-card__line shimmer" />
                    <div className="skeleton-card__line shimmer" />
                  </div>
                ))}
              </div>
            ) : searchResults.length ? (
              <div className="grid">
                {searchResults.map(result => (
                  <EventCard key={`${result.id ?? result.title}-${result.startsAt}`} event={result} />
                ))}
              </div>
            ) : !searchError && searchValue.trim() ? (
              <div className="empty">
                <h3>No matches yet</h3>
                <p>Try different keywords or adjust the filters to widen your search.</p>
              </div>
            ) : null}
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
            <h3>No events in this vibe yet</h3>
            <p>Switch categories or create a new listing from the organizer dashboard.</p>
          </div>
        )}
      </section>
    </main>
  )
}
