import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { render, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const apiMock = {
  listEvents: vi.fn().mockResolvedValue([]),
  search: vi.fn().mockResolvedValue({ results: [] }),
}

vi.mock("../../../src/lib/api", () => ({
  api: apiMock,
}))

describe("routes/Home", () => {
  beforeEach(() => {
    vi.resetModules()
    apiMock.listEvents.mockReset()
    apiMock.search.mockReset()
    apiMock.listEvents.mockResolvedValue([])
    apiMock.search.mockResolvedValue({ results: [] })
    localStorage.clear()
  })

  async function renderHome() {
    const Component = (await import("../../../src/routes/Home")).default
    return render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    )
  }

  it("renders the hero headline", async () => {
    const { getByText } = await renderHome()
    await waitFor(() => {
      expect(getByText(/Discover and book experiences/).tagName).toBe("H1")
    })
  })

  it("filters by category and runs a debounced search", async () => {
    localStorage.setItem("home:categoryFiltersVisible", "true")
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

    await waitFor(() => expect(apiMock.listEvents).toHaveBeenCalled())

    const musicChip = getByRole("button", { name: "Music" })
    await user.click(musicChip)
    expect(musicChip.getAttribute("aria-pressed")).toBe("true")

    const input = getByPlaceholderText("Search by artist, venue or vibe")
    await user.type(input, "Jazz")
    await waitFor(() => expect(apiMock.search).toHaveBeenCalled())
    expect(apiMock.search.mock.calls[0]?.[0]).toBe("Jazz")

    expect(await findByText("Jazz Search")).toBeDefined()
  })

  it("renders empty state when events fail to load", async () => {
    apiMock.listEvents.mockRejectedValueOnce(new Error("network"))
    const { findByText } = await renderHome()
    expect(await findByText(/No events in this vibe yet/)).toBeDefined()
  })

  it("shows search error messaging and avoids duplicate calls on empty submits", async () => {
    apiMock.search.mockRejectedValueOnce(new Error("boom"))

    const { getByPlaceholderText, getByRole, findByText } = await renderHome()
    const input = getByPlaceholderText("Search by artist, venue or vibe")

    await userEvent.type(input, "Comedy")
    await waitFor(() => expect(apiMock.search).toHaveBeenCalledTimes(1))
    expect(await findByText("We couldn't search right now. Please try again.")).toBeDefined()

    await userEvent.clear(input)
    await userEvent.click(getByRole("button", { name: "Search" }))
    expect(apiMock.search).toHaveBeenCalledTimes(1)
  })

  it("hides category chips when visibility events request it", async () => {
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

    const comedyChip = await findByRole("button", { name: "Comedy" })
    await userEvent.click(comedyChip)
    expect(comedyChip.getAttribute("aria-pressed")).toBe("true")

    window.dispatchEvent(
      new CustomEvent("homeCategoryFiltersVisibilityChanged", { detail: { value: false } })
    )

    await waitFor(() => expect(queryByRole("button", { name: "Comedy" })).toBeNull())
  })

  it("reacts to storage events toggling the filters", async () => {
    localStorage.setItem("home:categoryFiltersVisible", "true")
    const { queryByRole } = await renderHome()

    expect(queryByRole("button", { name: "All vibes" })).not.toBeNull()

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "home:categoryFiltersVisible",
        newValue: "false",
      })
    )

    await waitFor(() => expect(queryByRole("button", { name: "All vibes" })).toBeNull())
  })
})
