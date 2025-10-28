import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Profile from "../../src/routes/Profile"

const apiMock = vi.hoisted(() => ({
  me: vi.fn(),
}))

const navigateMock = vi.hoisted(() => vi.fn())
const clearTokenMock = vi.hoisted(() => vi.fn())

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock("../../src/lib/api", () => ({ api: apiMock }))
vi.mock("../../src/lib/auth", () => ({
  clearToken: clearTokenMock,
}))

function renderProfile() {
  render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Routes>
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("Profile page integration", () => {
  beforeEach(() => {
    apiMock.me.mockReset()
    navigateMock.mockReset()
    clearTokenMock.mockReset()
  })

  it("loads admin profile details and signs out", async () => {
    apiMock.me.mockResolvedValueOnce({
      user: {
        id: "user-1",
        email: "admin@eventstack.app",
        role: "ADMIN",
      },
    })
    const user = userEvent.setup()

    renderProfile()

    expect(await screen.findByText("admin@eventstack.app")).toBeTruthy()
    expect(screen.getAllByText("Administrator").length).toBeGreaterThan(0)
    const organizerLink = screen.getByRole("link", { name: "Organizer dashboard" })
    const adminLink = screen.getByRole("link", { name: "Admin console" })
    expect(organizerLink.getAttribute("href")).toBe("/organizer/dashboard")
    expect(adminLink.getAttribute("href")).toBe("/admin/dashboard")

    await user.click(screen.getByRole("button", { name: "Sign out" }))
    expect(clearTokenMock).toHaveBeenCalledTimes(1)
    expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true })
  })

  it("renders guest prompts when request is unauthorized", async () => {
    apiMock.me.mockRejectedValueOnce(new Error(JSON.stringify({ message: "Unauthorized token" })))

    renderProfile()

    expect(await screen.findByText("You are not signed in")).toBeTruthy()
    const signInLink = screen.getByRole("link", { name: "Sign in" })
    const organizerAccessLink = screen.getByRole("link", { name: "Organizer access" })
    expect(signInLink.getAttribute("href")).toBe("/login")
    expect(organizerAccessLink.getAttribute("href")).toBe("/organizer/login")
  })

  it("shows error state with retry when profile fetch fails", async () => {
    const reloadMock = vi.fn()
    const locationGetter = vi.spyOn(window, "location", "get").mockReturnValue({ reload: reloadMock } as unknown as Location)
    const locationSetter = vi.spyOn(window, "location", "set").mockImplementation(() => {})

    apiMock.me.mockRejectedValueOnce(new Error("Server unavailable"))
    const user = userEvent.setup()

    renderProfile()

    const alert = await screen.findByRole("alert")
    expect(alert.textContent || "").toContain("Server unavailable")

    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(reloadMock).toHaveBeenCalledTimes(1)
    locationGetter.mockRestore()
    locationSetter.mockRestore()
  })

  it("formats unknown roles gracefully without admin actions", async () => {
    apiMock.me.mockResolvedValueOnce({
      user: {
        id: "user-2",
        email: "creator@example.com",
        role: "SUPERHOST",
      },
    })

    renderProfile()

    await waitFor(() => expect(screen.getByText("creator@example.com")).toBeTruthy())
    expect(screen.getAllByText("Superhost").length).toBeGreaterThan(0)
    expect(screen.queryByRole("link", { name: "Organizer dashboard" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Admin console" })).toBeNull()
  })
})
