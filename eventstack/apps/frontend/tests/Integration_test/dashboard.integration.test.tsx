import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const apiMock = {
  listEvents: vi.fn(),
  getAnalytics: vi.fn(),
  listOrganizers: vi.fn(),
  updateUserRole: vi.fn(),
  updateUserStatus: vi.fn(),
  deleteUser: vi.fn(),
}

vi.mock("../../src/lib/api", () => ({
  api: apiMock,
}))

const eventFixtures = [
  {
    id: "evt-100",
    title: "Jazz Night Deluxe",
    summary: "Live at Blue Hall",
    startsAt: "2024-05-01T18:00:00.000Z",
    endsAt: "2024-05-01T21:00:00.000Z",
    categories: ["music", "featured"],
    coverUrl: "/uploads/jazz.jpg",
    venue: { name: "Blue Hall" },
  },
  {
    id: "evt-200",
    title: "Tech Summit Central",
    summary: "Future of innovation",
    startsAt: "2024-09-10T09:00:00.000Z",
    endsAt: "2024-09-10T18:00:00.000Z",
    categories: ["tech"],
    coverUrl: undefined,
    venue: { name: "Innovation Hub" },
  },
]

const analyticsFixture = {
  totalEvents: 12,
  totalUsers: 31,
  activeEvents: 4,
  upcomingEvents: 7,
  categoriesDistribution: [
    { category: "music", count: 5 },
    { category: "tech", count: 3 },
  ],
}

const organizersFixture = [
  {
    id: "org-1",
    email: "organizer@example.com",
    role: "ORGANIZER" as const,
    status: "ACTIVE" as const,
    created_at: "2024-02-01T12:00:00.000Z",
  },
]

const originalAlert = window.alert
const originalConfirm = window.confirm

describe("Admin dashboard integration", () => {
  beforeEach(() => {
    vi.resetModules()
    Object.values(apiMock).forEach(fn => fn.mockReset())

    apiMock.listEvents.mockResolvedValue(eventFixtures)
    apiMock.getAnalytics.mockResolvedValue(analyticsFixture)
    apiMock.listOrganizers.mockImplementation(async () =>
      organizersFixture.map(org => ({ ...org }))
    )
    apiMock.updateUserRole.mockResolvedValue({ id: "org-1", role: "ADMIN" })
    apiMock.updateUserStatus.mockResolvedValue({ id: "org-1", status: "SUSPENDED" })
    apiMock.deleteUser.mockResolvedValue({ ok: true })

    window.localStorage.clear()
    Object.defineProperty(window, "alert", { configurable: true, writable: true, value: vi.fn() })
    Object.defineProperty(window, "confirm", {
      configurable: true,
      writable: true,
      value: vi.fn(() => true),
    })
  })

  afterEach(() => {
    Object.defineProperty(window, "alert", { configurable: true, writable: true, value: originalAlert })
    Object.defineProperty(window, "confirm", { configurable: true, writable: true, value: originalConfirm })
    vi.clearAllMocks()
  })

  it("shows analytics, filters events and updates organizer state", async () => {
    const Dashboard = (await import("../../src/routes/admin/Dashboard")).default
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <Dashboard />
      </MemoryRouter>
    )

    expect(await screen.findByText("Jazz Night Deluxe")).toBeTruthy()
    expect(screen.getByText("Tech Summit Central")).toBeTruthy()

    expect(screen.getByText("Total Events")).toBeTruthy()
    expect(screen.getByText("12")).toBeTruthy()
    expect(screen.getByText("Total Users")).toBeTruthy()
    expect(screen.getByText("31")).toBeTruthy()
    expect(screen.getAllByText("Music").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Tech").length).toBeGreaterThan(0)

    const musicChip = screen.getByRole("button", { name: "Music" })
    await user.click(musicChip)

    await waitFor(() => {
      expect(screen.queryByText("Tech Summit Central")).toBeNull()
    })
    expect(screen.getByText("Jazz Night Deluxe")).toBeTruthy()

    const toggleFiltersButton = screen.getByRole("button", { name: /Hide home filters/i })
    await user.click(toggleFiltersButton)
    await waitFor(() => expect(toggleFiltersButton.textContent || "").toContain("Show home filters"))
    expect(window.localStorage.getItem("home:categoryFiltersVisible")).toBe("false")

    const roleSelect = await screen.findByDisplayValue("ORGANIZER")
    await user.selectOptions(roleSelect, "ADMIN")
    await waitFor(() => expect(apiMock.updateUserRole).toHaveBeenCalledWith("org-1", "ADMIN"))
    expect((roleSelect as HTMLSelectElement).value).toBe("ADMIN")

    const statusButton = screen.getByRole("button", { name: "Suspend" })
    await user.click(statusButton)
    await waitFor(() => expect(apiMock.updateUserStatus).toHaveBeenCalledWith("org-1", "SUSPENDED"))
    await waitFor(() => expect(statusButton.textContent || "").toContain("Activate"))
    expect(screen.getByText("SUSPENDED")).toBeTruthy()
  }, 10000)
})
