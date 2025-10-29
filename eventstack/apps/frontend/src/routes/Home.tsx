// React hooks for managing state and side effects
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// Router components for navigation and URL handling
import { Link, useSearchParams } from 'react-router-dom'
// Component for displaying individual event cards
import EventCard from '../components/EventCard'
// API functions for talking to the backend
import { api } from '../lib/api'
// Custom hook to wait a bit before doing something (like search)
import { useDebounce } from '../lib/debounce'
// Functions for showing/hiding category filters
import { HOME_CATEGORY_FILTERS_VISIBILITY, getHomeCategoryFiltersVisible } from '../lib/homeFiltersVisibility'

// What an event looks like when we get it from the server
type EventSummary = {
  id?: string
  title: string
  summary?: string
  startsAt: string
  endsAt?: string
  coverUrl?: string
  images?: Array<{ url: string }>
  categories?: string[]
  venue?: { name?: string }
}

// Some helpful constants
const HOME_SEARCH_ID = 'home-search' // This is the ID we use to scroll to the search box
const ALL = 'ALL' // When we want to show all events, not just one category

// Makes category names look nice (turns "rock_music" into "Rock Music")
const normalizeCategory = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export default function Home() {
  // Keep track of all the events we loaded from the server
  const [events, setEvents] = useState<EventSummary[]>([])
  const [loading, setLoading] = useState(true)
  
  // Which category is selected for filtering (starts with "ALL" to show everything)
  const [activeCategory, setActiveCategory] = useState<string>(ALL)
  const [showCategoryFilters, setShowCategoryFilters] = useState(() => getHomeCategoryFiltersVisible())

  // Stuff for the URL and search
  const [searchParams, setSearchParams] = useSearchParams()
  
  // What the user typed in the search box
  const [searchValue, setSearchValue] = useState('')
  
  // Results from searching
  const [searchResults, setSearchResults] = useState<EventSummary[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  // So we can focus the search box when needed
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load all events when the page first loads
  useEffect(() => {
    setLoading(true)
    api
      .listEvents()
      .then(setEvents)
      .catch(() => setEvents([])) // If something goes wrong, just show an empty list
      .finally(() => setLoading(false))
  }, [])

  // Get all the different categories from our events
  const categories = useMemo(() => {
    const set = new Set<string>()
    events.forEach(event => {
      event.categories?.forEach(category => {
        if (category.trim()) set.add(category) // Only add categories that aren't empty
      })
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b)) // Put them in alphabetical order
  }, [events])

  // Show only events that match the selected category
  const filteredEvents = useMemo(() => {
    if (activeCategory === ALL) return events
    return events.filter(event => event.categories?.includes(activeCategory))
  }, [activeCategory, events])

  // Count how many events we have and how many are coming up soon
  const stats = useMemo(() => {
    const now = Date.now()
    const total = filteredEvents.length
    const upcoming = filteredEvents.filter(event => {
      const start = new Date(event.startsAt).getTime()
      return !Number.isNaN(start) && start > now // Only count events that haven't happened yet
    }).length
    return { total, upcoming }
  }, [filteredEvents])

  // Actually do the search
  const runSearch = useCallback(
    async (query: string) => {
      const term = query.trim()
      if (!term) {
        // If they didn't type anything, clear the search results
        setSearchResults([])
        setSearchError('')
        setSearchLoading(false)
        return
      }

      setSearchLoading(true)
      try {
        const res = await api.search(term)
        setSearchResults(res.results ?? [])
        setSearchError('')
      } catch {
        // If the search fails, show a nice error message
        setSearchResults([])
        setSearchError("We couldn't search right now. Please try again.")
      } finally {
        setSearchLoading(false)
      }
    },
    []
  )

  // Wait a bit after they stop typing before searching (so we don't search on every keystroke)
  useDebounce(searchValue, 320, runSearch)

  // If the URL has ?search=1, focus the search box and scroll to it
  useEffect(() => {
    if (searchParams.has('search')) {
      searchInputRef.current?.focus({ preventScroll: true })
      document.getElementById(HOME_SEARCH_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [searchParams])

  // Listen for when other parts of the app want to show/hide the category filters
  useEffect(() => {
    if (typeof window === 'undefined') return // Don't run this on the server

    const handleVisibilityEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ value?: boolean }>).detail
      if (typeof detail?.value === 'boolean') {
        setShowCategoryFilters(detail.value)
      }
    }

    // Also listen for changes in localStorage (in case another tab changes it)
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

  // If they hide the category filters, go back to showing all events
  useEffect(() => {
    if (!showCategoryFilters) {
      setActiveCategory(ALL)
    }
  }, [showCategoryFilters])

  // When they submit the search form
  const handleSubmitSearch = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      runSearch(searchValue)
      setSearchParams(params => {
        const next = new URLSearchParams(params)
        if (searchValue.trim()) {
          next.set('search', '1') // Add ?search=1 to the URL
        } else {
          next.delete('search') // Remove it from the URL
        }
        return next
      })
    },
    [runSearch, searchValue, setSearchParams]
  )

  // Should we show the search results section?
  const showSearchState =
    Boolean(searchValue.trim()) || searchLoading || Boolean(searchResults.length) || Boolean(searchError)

  return (
    <main className="page">
      {/* The big hero section at the top */}
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
          {/* Show how many events we have */}
          <div className="row" role="status" aria-live="polite" aria-label="Live listing stats">
            <strong>{stats.total}</strong>
            <span className="meta-row">live events</span>
            <strong>{stats.upcoming}</strong>
            <span className="meta-row">happening soon</span>
          </div>
          {/* Buttons for organizers and admins */}
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

      {/* The category filter section */}
      <section aria-labelledby="category-heading" className="surface">
        <div className="section-heading">
          <h2 id="category-heading">Browse by vibe</h2>
        </div>
        {/* Show category buttons if filters are enabled */}
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

      {/* The search section */}
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
          </form>
          {/* Show error message if search failed */}
          {searchError ? <div className="alert alert--danger">{searchError}</div> : null}
        </div>

        {/* Show search results if they're searching */}
        {showSearchState ? (
          <div className="stack" aria-live="polite">
            {searchLoading ? (
              // Show loading placeholders while searching
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
              // Show the search results
              <div className="grid">
                {searchResults.map(result => (
                  <EventCard key={`${result.id ?? result.title}-${result.startsAt}`} event={result} />
                ))}
              </div>
            ) : !searchError && searchValue.trim() ? (
              // Show "no results" message
              <div className="empty">
                <h3>No matches yet</h3>
                <p>Try different keywords or adjust the filters to widen your search.</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* The main events list */}
      <section className="stack" aria-live="polite">
        {loading ? (
          // Show loading placeholders while we get the events
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
          // Show the events
          <div className="grid">
            {filteredEvents.map(event => (
              <EventCard key={`${event.id ?? event.title}-${event.startsAt}`} event={event} />
            ))}
          </div>
        ) : (
          // Show "no events" message if nothing matches the filter
          <div className="empty">
            <h3>No events in this vibe yet</h3>
            <p>Switch categories or create a new listing from the organizer dashboard.</p>
          </div>
        )}
      </section>
    </main>
  )
}
