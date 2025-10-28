import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import EventDetail from "../../src/routes/EventDetail"

const shareDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, "share")
const clipboardDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, "clipboard")
let clipboardMock: { writeText: ReturnType<typeof vi.fn> } | null = null

const apiMock = vi.hoisted(() => ({
  getEvent: vi.fn(),
  addBookmark: vi.fn(),
  removeBookmark: vi.fn(),
}))

const storageMock = vi.hoisted(() => ({
  addLocalBookmark: vi.fn(),
  removeLocalBookmark: vi.fn(),
  getLocalBookmarks: vi.fn(),
}))

vi.mock("../../src/lib/api", () => ({
  api: {
    ...apiMock,
  },
}))

vi.mock("../../src/lib/storage", () => storageMock)


describe("Event detail integration", () => {
  const originalShare = navigator.share
  const originalClipboard = navigator.clipboard
  const originalAlert = window.alert
  const originalOpen = window.open

  beforeEach(() => {
    Object.values(apiMock).forEach(fn => fn.mockReset())
    Object.values(storageMock).forEach(fn => fn.mockReset())
    ;Object.defineProperty(navigator, "share", { configurable: true, writable: true, value: vi.fn().mockResolvedValue(undefined) })
    ;Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
    window.alert = vi.fn()
    window.open = vi.fn()
  })

  afterEach(() => {
    if (shareDescriptor) { Object.defineProperty(navigator, "share", shareDescriptor) } else { delete (navigator as any).share }
    if (clipboardDescriptor) { Object.defineProperty(navigator, "clipboard", clipboardDescriptor) } else { delete (navigator as any).clipboard }
    clipboardMock = null
    window.alert = originalAlert
    window.open = originalOpen
  })

  it("renders event details, manages bookmarks, sharing and calendar export", async () => {
    const event = {
      id: "evt-1",
      title: "Festival of Lights",
      summary: "Annual celebration with music and food",
      startsAt: "2024-12-24T18:00:00.000Z",
      endsAt: "2024-12-24T22:00:00.000Z",
      coverUrl: "/uploads/festival.jpg",
      categories: ["culture", "family_fun"],
      venue: { name: "City Square" },
      images: [{ url: "/uploads/gallery1.jpg" }, { url: "https://cdn/events/gallery2.jpg" }],
    }

    storageMock.getLocalBookmarks.mockReturnValueOnce([])
    apiMock.getEvent.mockResolvedValueOnce(event)
    apiMock.addBookmark.mockResolvedValue({ ok: true })
    apiMock.removeBookmark.mockResolvedValue({ ok: true })

        const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/event/evt-1"]}>
        <Routes>
          <Route path="/event/:id" element={<EventDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole("heading", { name: "Festival of Lights" })).toBeTruthy()
    expect(screen.getByText("Culture")).toBeTruthy()
    const galleryImages = screen.getAllByRole("img", { name: "Festival of Lights" })
    expect(galleryImages.length).toBeGreaterThan(0)
    expect(screen.getByText("Schedule")).toBeTruthy()
    expect(screen.getByText("Venue")).toBeTruthy()

    const bookmarkButton = screen.getByRole("button", { name: "Bookmark" })
    await user.click(bookmarkButton)
    await waitFor(() => expect(apiMock.addBookmark).toHaveBeenCalledWith("evt-1"))
    expect(bookmarkButton.textContent).toContain("Remove")

    await user.click(bookmarkButton)
    await waitFor(() => expect(apiMock.removeBookmark).toHaveBeenCalledWith("evt-1"))

    const shareButton = screen.getByRole("button", { name: "Share" })
    await user.click(shareButton)
    await waitFor(() => expect(navigator.share).toHaveBeenCalledTimes(1))

    ;(navigator as any).share = undefined
    await user.click(shareButton)
    expect(window.alert).toHaveBeenCalledWith("Link copied to clipboard")

    const calendarButton = screen.getByRole("button", { name: "Add to calendar" })
    await user.click(calendarButton)
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1))
    expect((window.open as any).mock.calls[0][0]).toContain("https://www.google.com/calendar/render")
  })

  it("shows fallback when event fails to load", async () => {
    storageMock.getLocalBookmarks.mockReturnValue([])
    apiMock.getEvent.mockRejectedValueOnce(new Error("not found"))

        const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/event/missing"]}>
        <Routes>
          <Route path="/event/:id" element={<EventDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText("Event not found")).toBeTruthy()
    expect(screen.getByText("Unable to load this event right now.")).toBeTruthy()
  })
})













