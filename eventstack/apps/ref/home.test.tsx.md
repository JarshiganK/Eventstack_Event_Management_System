# Home.test.tsx Documentation

## File Location
`apps/frontend/tests/Unit_test/routes/Home.test.tsx`

## Overview
Unit tests for the Home component that verify all functionality including rendering, filtering, searching, error handling, and interaction features.

## Testing Framework
- **Vitest**: Testing framework
- **React Testing Library**: For rendering and querying components
- **userEvent**: For simulating user interactions

## Imports

```typescript
// Testing framework imports
import { beforeEach, describe, expect, it, vi } from "vitest"
// React for JSX
import React from "react"
// Router for testing components that use navigation
import { MemoryRouter } from "react-router-dom"
// React testing utilities
import { render, waitFor } from "@testing-library/react"
// Simulate user interactions like clicking and typing
import userEvent from "@testing-library/user-event"
```

## Mock Setup

### API Mock
```typescript
const apiMock = {
  listEvents: vi.fn().mockResolvedValue([]),
  search: vi.fn().mockResolvedValue({ results: [] }),
}
```
- Creates mock functions for API calls
- Defaults to returning empty arrays

### Mock Registration
```typescript
vi.mock("../../../src/lib/api", () => ({
  api: apiMock,
}))
```
- Replaces the real API with mock for testing
- Allows controlling what API returns in each test

## Test Structure

### beforeEach Hook
```typescript
beforeEach(() => {
  vi.resetModules()
  apiMock.listEvents.mockReset()
  apiMock.search.mockReset()
  apiMock.listEvents.mockResolvedValue([])
  apiMock.search.mockResolvedValue({ results: [] })
  localStorage.clear()
})
```
- Runs before each test to ensure clean state
- Resets modules, mocks, and localStorage
- Prevents tests from interfering with each other

### Helper Function
```typescript
async function renderHome() {
  const Component = (await import("../../../src/routes/Home")).default
  return render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>
  )
}
```
- Dynamically imports Home component
- Wraps in MemoryRouter for routing
- Returns render result for testing

## Test Cases

### 1. Hero Headline Test
```typescript
it("renders the hero headline", async () => {
  const { getByText } = await renderHome()
  await waitFor(() => {
    expect(getByText(/Discover and book experiences/).tagName).toBe("H1")
  })
})
```
- **Purpose**: Verifies main headline renders correctly
- **What it tests**: 
  - Hero section text displays
  - Text is in H1 tag
- **Verification**: Checks tagName is "H1"

### 2. Category Filtering and Search Test
```typescript
it("filters by category and runs a debounced search", async () => {
  // Test setup with localStorage and mock data
  localStorage.setItem("home:categoryFiltersVisible", "true")
  const events = [/* test events */]
  apiMock.listEvents.mockResolvedValue(events)
  apiMock.search.mockResolvedValue({ results: [/* test results */] })
  
  // Render component and interact
  const user = userEvent.setup()
  const { getByRole, getByPlaceholderText, findByText } = await renderHome()
  
  // Verify API was called
  await waitFor(() => expect(apiMock.listEvents).toHaveBeenCalled())
  
  // Test category filtering
  const musicChip = getByRole("button", { name: "Music" })
  await user.click(musicChip)
  expect(musicChip.getAttribute("aria-pressed")).toBe("true")
  
  // Test search functionality
  const input = getByPlaceholderText("Search by artist, venue or vibe")
  await user.type(input, "Jazz")
  await waitFor(() => expect(apiMock.search).toHaveBeenCalled())
  expect(apiMock.search.mock.calls[0]?.[0]).toBe("Jazz")
  
  // Verify search results appear
  expect(await findByText("Jazz Search")).toBeDefined()
})
```
- **Purpose**: Tests full user flow of category filtering and search
- **What it tests**:
  - Category chips work correctly
  - Clicking category updates aria-pressed attribute
  - Search input works
  - Search API is called with correct query
  - Search results display
  - Debouncing works (waits for API call)
- **Verification**: Checks all interaction states

### 3. Error Handling Test
```typescript
it("renders empty state when events fail to load", async () => {
  apiMock.listEvents.mockRejectedValueOnce(new Error("network"))
  const { findByText } = await renderHome()
  expect(await findByText(/No events in this vibe yet/)).toBeDefined()
})
```
- **Purpose**: Tests graceful error handling
- **What it tests**:
  - Component doesn't crash when API fails
  - Displays helpful empty state message
  - Handles errors gracefully
- **Verification**: Checks error message displays

### 4. Search Error and Duplicate Call Prevention Test
```typescript
it("shows search error messaging and avoids duplicate calls on empty submits", async () => {
  apiMock.search.mockRejectedValueOnce(new Error("boom"))
  
  const { getByPlaceholderText, getByRole, findByText } = await renderHome()
  const input = getByPlaceholderText("Search by artist, venue or vibe")
  
  // Type something to trigger search
  await userEvent.type(input, "Comedy")
  await waitFor(() => expect(apiMock.search).toHaveBeenCalledTimes(1))
  
  // Verify error message displays
  expect(await findByText("We couldn't search right now. Please try again.")).toBeDefined()
  
  // Clear input and submit empty form
  await userEvent.clear(input)
  await userEvent.click(getByRole("button", { name: "Search" }))
  
  // Verify API wasn't called again (only once total)
  expect(apiMock.search).toHaveBeenCalledTimes(1)
})
```
- **Purpose**: Tests search error handling and prevents unnecessary API calls
- **What it tests**:
  - Error messages display when search fails
  - Empty search doesn't trigger unnecessary API calls
  - Search button respects debouncing
- **Verification**: 
  - Error message appears
  - API only called once

### 5. Category Visibility Custom Event Test
```typescript
it("hides category chips when visibility events request it", async () => {
  localStorage.setItem("home:categoryFiltersVisible", "true")
  // Setup test data
  
  const { findByRole, queryByRole } = await renderHome()
  
  // Verify chip is visible
  const comedyChip = await findByRole("button", { name: "Comedy" })
  await userEvent.click(comedyChip)
  expect(comedyChip.getAttribute("aria-pressed")).toBe("true")
  
  // Dispatch custom event to hide filters
  window.dispatchEvent(
    new CustomEvent("homeCategoryFiltersVisibilityChanged", { detail: { value: false } })
  )
  
  // Verify chip disappears
  await waitFor(() => expect(queryByRole("button", { name: "Comedy" })).toBeNull())
})
```
- **Purpose**: Tests dynamic category filter visibility via custom events
- **What it tests**:
  - Custom events affect component state
  - Category chips can be hidden programmatically
  - Component responds to external events
- **Verification**: Checks chip visibility changes

### 6. Storage Event Test
```typescript
it("reacts to storage events toggling the filters", async () => {
  localStorage.setItem("home:categoryFiltersVisible", "true")
  const { queryByRole } = await renderHome()
  
  // Verify filters are visible
  expect(queryByRole("button", { name: "All vibes" })).not.toBeNull()
  
  // Simulate localStorage change from another tab
  window.dispatchEvent(
    new StorageEvent("storage", {
      key: "home:categoryFiltersVisible",
      newValue: "false",
    })
  )
  
  // Verify filters are hidden
  await waitFor(() => expect(queryByRole("button", { name: "All vibes" })).toBeNull())
})
```
- **Purpose**: Tests cross-tab synchronization via localStorage
- **What it tests**:
  - Component listens to storage events
  - Multi-tab functionality works
  - localStorage changes update UI
- **Verification**: Checks component reacts to storage changes

## Testing Patterns

### Using waitFor
```typescript
await waitFor(() => expect(apiMock.listEvents).toHaveBeenCalled())
```
- Waits for async operations to complete
- Prevents flaky tests by giving time for state updates

### Using findByText
```typescript
expect(await findByText("Jazz Search")).toBeDefined()
```
- Waits for element to appear in DOM
- More reliable than getByText for async content

### Using queryByRole
```typescript
expect(queryByRole("button", { name: "Comedy" })).toBeNull()
```
- Returns null instead of throwing if not found
- Useful for checking absence of elements

### Mock Verification
```typescript
expect(apiMock.search).toHaveBeenCalledTimes(1)
expect(apiMock.search.mock.calls[0]?.[0]).toBe("Jazz")
```
- Verifies mock functions were called correctly
- Checks call arguments

## Best Practices Demonstrated

1. **Isolation**: Each test starts with clean state
2. **Mocking**: External dependencies are mocked
3. **Async Handling**: Proper use of waitFor and findBy methods
4. **User Simulation**: Uses userEvent for realistic interactions
5. **Error Testing**: Tests both success and failure scenarios
6. **Integration**: Tests full user flows, not just isolated functions
7. **Accessibility**: Tests ARIA attributes and labels

## Key Testing Utilities

### render
- Renders React component to DOM
- Returns query methods for finding elements

### waitFor
- Waits for async operations
- Retries until condition is met or timeout

### userEvent
- Simulates real user interactions
- More reliable than fireEvent for user actions

### vi.fn()
- Creates mock functions
- Can track calls and return values

### mockResolvedValue / mockRejectedValue
- Sets what mock should return
- Used to simulate success/failure scenarios

