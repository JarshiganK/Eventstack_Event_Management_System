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

// Mock the API functions so we can control what they return
const apiMock = {
  listEvents: vi.fn().mockResolvedValue([]),
  search: vi.fn().mockResolvedValue({ results: [] }),
}

// Replace the real API with our mock for testing
vi.mock("../../../src/lib/api", () => ({
  api: apiMock,
}))

describe("routes/Home", () => {
  // Clean up before each test so they don't interfere with each other
  beforeEach(() => {
    vi.resetModules()
    apiMock.listEvents.mockReset()
    apiMock.search.mockReset()
    apiMock.listEvents.mockResolvedValue([])
    apiMock.search.mockResolvedValue({ results: [] })
    localStorage.clear()
  })

  // Helper function to render the Home component for testing
  async function renderHome() {
    const Component = (await import("../../../src/routes/Home")).default
    return render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    )
  }

  // Test that the main headline shows up correctly
  it("renders the hero headline", async () => {
    const { getByText } = await renderHome()
    await waitFor(() => {
      expect(getByText(/Discover and book experiences/).tagName).toBe("H1")
    })
  })

  // Test category filtering and search functionality
  it("filters by category and runs a debounced search", async () => {
    // Enable category filters for this test
    localStorage.setItem("home:categoryFiltersVisible", "true")
    
    // Set up some fake events to test with
    const events = [
      {
        id: "evt-1",
        title: "Jazz Night",
        startsAt: new Date().toISOString(),
        categories: ["music"],
        venue: { name: "Blue Hall" },
      },
    ]
    apiMock.listEvents.mockResolvedValue(events)
    apiMock.search.mockResolvedValue({
      results: [
        {
          id: "res-1",
          title: "Jazz Search",
          startsAt: new Date().toISOString(),
        },
      ],
    })

    const user = userEvent.setup()
    const { getByRole, getByPlaceholderText, findByText } = await renderHome()

    // Wait for the events to load
    await waitFor(() => expect(apiMock.listEvents).toHaveBeenCalled())

    // Click on the "Music" category chip
    const musicChip = getByRole("button", { name: "Music" })
    await user.click(musicChip)
    expect(musicChip.getAttribute("aria-pressed")).toBe("true")

    // Type in the search box and wait for search to be called
    const input = getByPlaceholderText("Search by artist, venue or vibe")
    await user.type(input, "Jazz")
    await waitFor(() => expect(apiMock.search).toHaveBeenCalled())
    expect(apiMock.search.mock.calls[0]?.[0]).toBe("Jazz")

    // Check that search results show up
    expect(await findByText("Jazz Search")).toBeDefined()
  })

  // Test what happens when the API fails to load events
  it("renders empty state when events fail to load", async () => {
    // Make the API call fail
    apiMock.listEvents.mockRejectedValueOnce(new Error("network"))
    const { findByText } = await renderHome()
    // Check that we show a nice error message instead of crashing
    expect(await findByText(/No events in this vibe yet/)).toBeDefined()
  })

  // Test search error handling and prevent duplicate API calls
  it("shows search error messaging and avoids duplicate calls on empty submits", async () => {
    // Make the search API fail
    apiMock.search.mockRejectedValueOnce(new Error("boom"))

    const { getByPlaceholderText, getByRole, findByText } = await renderHome()
    const input = getByPlaceholderText("Search by artist, venue or vibe")

    // Type something and wait for search to be called
    await userEvent.type(input, "Comedy")
    await waitFor(() => expect(apiMock.search).toHaveBeenCalledTimes(1))
    // Check that error message shows up
    expect(await findByText("We couldn't search right now. Please try again.")).toBeDefined()

    // Clear the input and submit empty form - should not call API again
    await userEvent.clear(input)
    await userEvent.click(getByRole("button", { name: "Search" }))
    expect(apiMock.search).toHaveBeenCalledTimes(1)
  })

  // Test that category filters can be hidden via custom events
  it("hides category chips when visibility events request it", async () => {
    // Start with category filters visible
    localStorage.setItem("home:categoryFiltersVisible", "true")
    apiMock.listEvents.mockResolvedValue([
      {
        id: "evt-1",
        title: "Comedy Night",
        startsAt: new Date().toISOString(),
        categories: ["comedy"],
      },
    ])

    const { findByRole, queryByRole } = await renderHome()

    // Click on comedy chip to make sure it's there
    const comedyChip = await findByRole("button", { name: "Comedy" })
    await userEvent.click(comedyChip)
    expect(comedyChip.getAttribute("aria-pressed")).toBe("true")

    // Send a custom event to hide the category filters
    window.dispatchEvent(
      new CustomEvent("homeCategoryFiltersVisibilityChanged", { detail: { value: false } })
    )

    // Check that the comedy chip disappears
    await waitFor(() => expect(queryByRole("button", { name: "Comedy" })).toBeNull())
  })

  // Test that localStorage changes affect category filter visibility
  it("reacts to storage events toggling the filters", async () => {
    // Start with filters visible
    localStorage.setItem("home:categoryFiltersVisible", "true")
    const { queryByRole } = await renderHome()

    // Check that "All vibes" button is visible
    expect(queryByRole("button", { name: "All vibes" })).not.toBeNull()

    // Simulate localStorage change from another tab
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "home:categoryFiltersVisible",
        newValue: "false",
      })
    )

    // Check that "All vibes" button disappears
    await waitFor(() => expect(queryByRole("button", { name: "All vibes" })).toBeNull())
  })
})
