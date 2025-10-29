# React Hooks Documentation

## Overview
This document explains all React hooks used in the EventStack application, their purpose, syntax, and usage patterns.

## Contents
1. [useState](#usestate)
2. [useEffect](#useeffect)
3. [useMemo](#usememo)
4. [useCallback](#usecallback)
5. [useRef](#useref)
6. [useParams](#useparams)
7. [useSearchParams](#usesearchparams)

---

## useState

### Purpose
Manages component state. Stores data that can change and triggers re-renders when updated.

### Syntax
```typescript
const [state, setState] = useState(initialValue)
```

### Parameters
- **initialValue**: The initial state value (can be any type)

### Returns
- **state**: Current state value
- **setState**: Function to update the state

### Example from Home.tsx
```typescript
// Array state
const [events, setEvents] = useState<EventSummary[]>([])

// Boolean state
const [loading, setLoading] = useState(true)

// String state
const [activeCategory, setActiveCategory] = useState<string>(ALL)

// Function initializer
const [showCategoryFilters, setShowCategoryFilters] = useState(() => 
  getHomeCategoryFiltersVisible()
)
```

### Usage Patterns

#### Basic State
```typescript
const [count, setCount] = useState(0)

// Update state
setCount(count + 1)

// Function update
setCount(prevCount => prevCount + 1)
```

#### Array State
```typescript
const [items, setItems] = useState([])

// Add to array
setItems([...items, newItem])

// Remove from array
setItems(items.filter(item => item.id !== id))
```

#### Boolean State
```typescript
const [isOpen, setIsOpen] = useState(false)

// Toggle
setIsOpen(!isOpen)
```

#### Function Initializer
```typescript
const [value, setValue] = useState(() => {
  // Expensive computation
  return complexInitialization()
})
```
- **When to use**: When initial value requires computation
- **Benefit**: Only runs once on mount, not every render

### Best Practices
1. Keep state minimal - only what triggers re-renders
2. Lift state up when multiple components need it
3. Use function updates for state that depends on previous state
4. Initialize with default values for optional state

---

## useEffect

### Purpose
Handles side effects in functional components. Runs after render and can perform data fetching, subscriptions, or DOM manipulation.

### Syntax
```typescript
useEffect(() => {
  // Side effect code
}, [dependencies])
```

### Parameters
- **effect function**: Function containing side effect code
- **dependencies** (optional): Array of values that trigger the effect when changed

### Example from Home.tsx
```typescript
// Run once on mount
useEffect(() => {
  setLoading(true)
  api
    .listEvents()
    .then(setEvents)
    .catch(() => setEvents([]))
    .finally(() => setLoading(false))
}, []) // Empty array = run once

// Run when URL params change
useEffect(() => {
  if (searchParams.has('search')) {
    searchInputRef.current?.focus({ preventScroll: true })
  }
}, [searchParams]) // Runs when searchParams changes

// With cleanup
useEffect(() => {
  window.addEventListener('storage', handleStorage)
  return () => {
    window.removeEventListener('storage', handleStorage)
  }
}, []) // Cleanup runs when component unmounts
```

### Dependencies Array Behaviors

#### No Dependencies (Run Once)
```typescript
useEffect(() => {
  // Runs once when component mounts
}, [])
```
- **Use case**: Initial setup, data loading
- **Runs**: Once on mount

#### With Dependencies (Run on Change)
```typescript
useEffect(() => {
  // Runs whenever 'value' changes
}, [value])
```
- **Use case**: Re-running effect when data changes
- **Runs**: Whenever `value` changes

#### Empty Array (No Dependencies)
```typescript
useEffect(() => {
  // Runs on every render (avoid this)
})
```
- **Warning**: Can cause infinite loops
- **Should have**: Dependencies array

### Cleanup Function
```typescript
useEffect(() => {
  const subscription = subscribe()
  
  return () => {
    // Cleanup code
    subscription.unsubscribe()
  }
}, [])
```
- **Purpose**: Clean up resources to prevent memory leaks
- **Runs**: When component unmounts or dependencies change
- **Use cases**: 
  - Remove event listeners
  - Cancel API requests
  - Clear timeouts/intervals

### Common Patterns

#### Data Fetching
```typescript
useEffect(() => {
  let cancelled = false
  
  fetch('/api/data')
    .then(res => res.json())
    .then(data => {
      if (!cancelled) {
        setData(data)
      }
    })
    
  return () => {
    cancelled = true
  }
}, [])
```

#### Event Listeners
```typescript
useEffect(() => {
  const handleClick = () => console.log('clicked')
  window.addEventListener('click', handleClick)
  
  return () => {
    window.removeEventListener('click', handleClick)
  }
}, [])
```

#### Update on Prop Change
```typescript
useEffect(() => {
  fetchUser(id).then(setUser)
}, [id]) // Re-fetch when id changes
```

### Best Practices
1. Always include dependencies to avoid stale closures
2. Use cleanup functions to prevent memory leaks
3. Separate concerns into different useEffect hooks
4. Use early returns to avoid unnecessary work
5. Handle loading and error states

---

## useMemo

### Purpose
Memoizes expensive computations. Only recomputes when dependencies change.

### Syntax
```typescript
const memoizedValue = useMemo(() => {
  return expensiveComputation()
}, [dependencies])
```

### Parameters
- **computation function**: Function that returns a value
- **dependencies**: Array of values that trigger recomputation

### Example from Home.tsx
```typescript
// Extract unique categories from events
const categories = useMemo(() => {
  const set = new Set<string>()
  events.forEach(event => {
    event.categories?.forEach(category => {
      if (category.trim()) set.add(category)
    })
  })
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}, [events])
// Only recomputes when 'events' changes

// Filter events by category
const filteredEvents = useMemo(() => {
  if (activeCategory === ALL) return events
  return events.filter(event => event.categories?.includes(activeCategory))
}, [activeCategory, events])
// Recomputes when category or events change

// Calculate statistics
const stats = useMemo(() => {
  const now = Date.now()
  const total = filteredEvents.length
  const upcoming = filteredEvents.filter(event => {
    const start = new Date(event.startsAt).getTime()
    return !Number.isNaN(start) && start > now
  }).length
  return { total, upcoming }
}, [filteredEvents])
// Recomputes when filtered events change
```

### When to Use

#### ✅ Good Use Cases
1. **Expensive computations**
```typescript
const sortedData = useMemo(() => {
  return largeArray.sort((a, b) => a.localeCompare(b))
}, [largeArray])
```

2. **Object/Array creation**
```typescript
const memoizedObject = useMemo(() => ({
  key: value
}), [value])
```

3. **Derived values**
```typescript
const fullName = useMemo(() => 
  `${firstName} ${lastName}`, 
  [firstName, lastName]
)
```

#### ❌ Avoid When
1. Simple computations
2. Values that change every render anyway
3. Primitive values

### Performance Comparison

#### Without useMemo
```typescript
// Recomputes on every render
const categories = events.flatMap(e => e.categories).filter(Boolean)
```

#### With useMemo
```typescript
// Recomputes only when events change
const categories = useMemo(
  () => events.flatMap(e => e.categories).filter(Boolean),
  [events]
)
```

### Best Practices
1. Use for expensive computations
2. Include all dependencies
3. Don't rely on it for correctness (use state for that)
4. Prefer useMemo over useCallback when computing values

---

## useCallback

### Purpose
Memoizes functions to prevent unnecessary re-renders. Returns the same function reference unless dependencies change.

### Syntax
```typescript
const memoizedFunction = useCallback(() => {
  // Function code
}, [dependencies])
```

### Parameters
- **function**: Function to memoize
- **dependencies**: Array of values that trigger recreation when changed

### Example from Home.tsx
```typescript
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
      const res = await api.search(term)
      setSearchResults(res.results ?? [])
      setSearchError('')
    } catch {
      setSearchResults([])
      setSearchError("We couldn't search right now. Please try again.")
    } finally {
      setSearchLoading(false)
    }
  },
  [] // No dependencies - function never changes
)

const handleSubmitSearch = useCallback(
  (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    runSearch(searchValue)
    setSearchParams(params => {
      // ...
    })
  },
  [runSearch, searchValue, setSearchParams]
  // Recreate when these dependencies change
)
```

### When to Use

#### ✅ Good Use Cases
1. **Passing functions to child components**
```typescript
const handleClick = useCallback(() => {
  doSomething(id)
}, [id])
```

2. **Preventing unnecessary re-renders**
```typescript
<ExpensiveComponent onClick={handleClick} />
```

3. **Dependencies in other hooks**
```typescript
const fetchData = useCallback(() => { /* ... */ }, [])
useEffect(() => {
  fetchData()
}, [fetchData]) // Won't re-run unnecessarily
```

#### ❌ Avoid When
1. Simple functions with no dependencies
2. Functions that change frequently anyway
3. Functions only used once

### Performance Impact

#### Without useCallback
```typescript
// New function created every render
const handleClick = () => console.log('clicked')

// Child component re-renders unnecessarily
<Child onClick={handleClick} />
```

#### With useCallback
```typescript
// Same function reference (prevents re-render)
const handleClick = useCallback(
  () => console.log('clicked'),
  []
)

// Child component doesn't re-render
<Child onClick={handleClick} />
```

### Best Practices
1. Use with React.memo for child components
2. Include all dependencies from function body
3. Don't use for functions created inside render
4. Use for event handlers passed as props

---

## useRef

### Purpose
Returns a mutable ref object that persists across renders without causing re-renders when updated.

### Syntax
```typescript
const ref = useRef(initialValue)
```

### Parameters
- **initialValue**: Initial value for the ref

### Example from Home.tsx
```typescript
// Create ref for search input
const searchInputRef = useRef<HTMLInputElement>(null)

// Use in useEffect to focus
useEffect(() => {
  if (searchParams.has('search')) {
    searchInputRef.current?.focus({ preventScroll: true })
  }
}, [searchParams])

// Attach to input element
<input
  ref={searchInputRef}
  className="search-input"
  placeholder="Search by artist, venue or vibe"
  value={searchValue}
  onChange={event => setSearchValue(event.target.value)}
  aria-label="Search events"
/>
```

### Common Use Cases

#### 1. DOM Element Access
```typescript
const inputRef = useRef<HTMLInputElement>(null)

// Access DOM element
inputRef.current?.focus()
```

#### 2. Storing Mutable Values
```typescript
const countRef = useRef(0)

// Update without re-render
countRef.current = countRef.current + 1
```

#### 3. Storing Previous Values
```typescript
const prevValueRef = useRef()

useEffect(() => {
  prevValueRef.current = value
})
```

### Key Differences from State

| Feature | useState | useRef |
|---------|----------|--------|
| Triggers re-render | ✅ Yes | ❌ No |
| Persists across renders | ✅ Yes | ✅ Yes |
| Direct access | ❌ No | ✅ Yes |
| Updates synchronously | ❌ No | ✅ Yes |

### Best Practices
1. Use for accessing DOM elements
2. Use for storing mutable values without re-renders
3. Always check `.current` before accessing
4. Don't read/write during render

---

## useParams

### Purpose
Hook for accessing URL parameters in React Router.

### Import
```typescript
import { useParams } from 'react-router-dom'
```

### Syntax
```typescript
const params = useParams()
```

### Example from EventDetail.tsx
```typescript
const { id = '' } = useParams()

// Use in component
useEffect(() => {
  if (!id) return
  api.getEvent(id).then(setEvent)
}, [id])
```

### Behavior
- Returns object with URL parameter values
- Automatically updates when route changes
- Returns empty string as default if parameter missing

### URL Structure
```
/event/:id
/event/abc123
```
- `id` would be `'abc123'`

---

## useSearchParams

### Purpose
Hook for accessing and updating URL search parameters (query string).

### Import
```typescript
import { useSearchParams } from 'react-router-dom'
```

### Syntax
```typescript
const [searchParams, setSearchParams] = useSearchParams()
```

### Example from Home.tsx
```typescript
// Get current search params
const [searchParams, setSearchParams] = useSearchParams()

// Check for parameter
if (searchParams.has('search')) {
  // Do something
}

// Update search params
setSearchParams(params => {
  const next = new URLSearchParams(params)
  if (searchValue.trim()) {
    next.set('search', '1')
  } else {
    next.delete('search')
  }
  return next
})
```

### Methods

#### get
```typescript
const value = searchParams.get('key')
```

#### has
```typescript
const exists = searchParams.has('key')
```

#### set
```typescript
setSearchParams(params => {
  const next = new URLSearchParams(params)
  next.set('key', 'value')
  return next
})
```

#### delete
```typescript
setSearchParams(params => {
  const next = new URLSearchParams(params)
  next.delete('key')
  return next
})
```

### URL Examples
```
// Current URL
https://example.com/events?search=1&category=music

// Get values
searchParams.get('search') // '1'
searchParams.get('category') // 'music'
searchParams.has('search') // true
```

### Best Practices
1. Update params to reflect UI state
2. Provide defaults for optional params
3. Parse params into proper types
4. Keep URL state in sync with component state

---

## Common Hook Combinations

### Data Fetching Pattern
```typescript
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetchData().then(setData).finally(() => setLoading(false))
}, [])
```

### Memoized Derived State
```typescript
const [items, setItems] = useState([])
const filtered = useMemo(
  () => items.filter(item => item.active),
  [items]
)
```

### Callback with Dependencies
```typescript
const fetchData = useCallback(() => {
  api.getData(id)
}, [id])

useEffect(() => {
  fetchData()
}, [fetchData])
```

### Form with Multiple State
```typescript
const [form, setForm] = useState({ name: '', email: '' })
const [errors, setErrors] = useState({})

const handleChange = useCallback((field, value) => {
  setForm(prev => ({ ...prev, [field]: value }))
}, [])

const isValid = useMemo(
  () => form.name && form.email,
  [form]
)
```

## Summary Table

| Hook | Purpose | Triggers Re-render | Dependencies |
|------|---------|-------------------|--------------|
| useState | Store state | ✅ Yes | Always |
| useEffect | Side effects | ❌ No | Required array |
| useMemo | Memoize values | ❌ No | Required array |
| useCallback | Memoize functions | ❌ No | Required array |
| useRef | Mutable reference | ❌ No | None |
| useParams | URL params | ✅ Yes | Route change |
| useSearchParams | Query params | ✅ Yes | URL change |

## Tips and Tricks

1. **Always include dependencies** in useEffect, useMemo, useCallback
2. **Use ESLint rules** to catch missing dependencies
3. **Memoize expensive computations** with useMemo
4. **Stabilize functions** with useCallback for child components
5. **Clean up effects** to prevent memory leaks
6. **Don't use hooks conditionally** - always call them in same order
7. **Use useRef** for values that don't need re-renders

