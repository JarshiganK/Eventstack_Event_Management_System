import { describe, expect, it, beforeEach, vi } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Login from "../../src/routes/Login"
import AdminLogin from "../../src/routes/admin/AdminLogin"
import OrganizerLogin from "../../src/routes/organizer/OrganizerLogin"

const navigateMock = vi.hoisted(() => vi.fn())
const setTokenMock = vi.hoisted(() => vi.fn())
const fetchRoleMock = vi.hoisted(() => vi.fn())

const apiMock = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock("../../src/lib/api", () => ({ api: apiMock }))
vi.mock("../../src/lib/auth", () => ({
  setToken: setTokenMock,
  fetchRole: fetchRoleMock,
}))

describe("Authentication flows", () => {
  beforeEach(() => {
    Object.values(apiMock).forEach(fn => fn.mockReset())
    navigateMock.mockReset()
    setTokenMock.mockReset()
    fetchRoleMock.mockReset()
  })

  it("logs in existing user and redirects by role", async () => {
    const user = userEvent.setup()
    apiMock.login.mockResolvedValueOnce({ token: "tok", user: { role: "USER" } })

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText("Email"), "user@example.com")
    await user.type(screen.getByLabelText("Password"), "secret123")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() => expect(apiMock.login).toHaveBeenCalledWith("user@example.com", "secret123"))
    expect(setTokenMock).toHaveBeenCalledWith("tok")
    expect(navigateMock).toHaveBeenCalledWith("/")
  })

  it("creates organizer account and routes to dashboard", async () => {
    const user = userEvent.setup()
    apiMock.register.mockResolvedValueOnce({ token: "tok2", user: { role: "ORGANIZER" } })

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Need an account? Create one" }))
    await user.type(screen.getByLabelText("Email"), "org@example.com")
    await user.type(screen.getByLabelText("Password"), "longerpass")
    const organizerRadio = await screen.findByRole("radio", { name: /Organizer/i })
    await user.click(organizerRadio)
    await user.click(screen.getByRole("button", { name: "Create account" }))

    await waitFor(() => expect(apiMock.register).toHaveBeenCalledWith("org@example.com", "longerpass", "ORGANIZER"))
    expect(setTokenMock).toHaveBeenCalledWith("tok2")
    expect(navigateMock).toHaveBeenCalledWith("/organizer/dashboard")
  })

  it("shows error when login fails", async () => {
    const user = userEvent.setup()
    apiMock.login.mockRejectedValueOnce(new Error(JSON.stringify({ message: "Invalid credentials" })))

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText("Email"), "user@example.com")
    await user.type(screen.getByLabelText("Password"), "secret123")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(await screen.findByText("Invalid credentials")).toBeTruthy()
  })

  it("signs in admin users via admin login", async () => {
    const user = userEvent.setup()
    apiMock.login.mockResolvedValueOnce({ token: "admin-token", user: { role: "ADMIN" } })

    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<AdminLogin />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText("Email"), "admin@eventstack.com")
    await user.type(screen.getByLabelText("Password"), "adminpass")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    await waitFor(() => expect(apiMock.login).toHaveBeenCalledWith("admin@eventstack.com", "adminpass"))
    expect(setTokenMock).toHaveBeenCalledWith("admin-token")
    expect(navigateMock).toHaveBeenCalledWith("/admin/dashboard")
  })

  it("redirects organizer users immediately", async () => {
    fetchRoleMock.mockResolvedValueOnce("ADMIN")

    render(
      <MemoryRouter initialEntries={["/organizer"]}>
        <Routes>
          <Route path="/organizer" element={<OrganizerLogin />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/organizer/dashboard"))
  })

  it("prevents non-organizer access in organizer login", async () => {
    const user = userEvent.setup()
    fetchRoleMock.mockResolvedValueOnce("USER")
    apiMock.login.mockResolvedValueOnce({ token: "tok", user: { role: "USER" } })

    render(
      <MemoryRouter initialEntries={["/organizer"]}>
        <Routes>
          <Route path="/organizer" element={<OrganizerLogin />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByLabelText("Email"), "member@example.com")
    await user.type(screen.getByLabelText("Password"), "memberpass")
    await user.click(screen.getByRole("button", { name: "Sign in" }))

    expect(await screen.findByText("Not organizer")).toBeTruthy()
  })

  it("allows organizer signup flow", async () => {
    const user = userEvent.setup()
    fetchRoleMock.mockResolvedValueOnce(undefined)
    apiMock.register.mockResolvedValueOnce({ token: "org-token", user: { role: "ORGANIZER" } })

    render(
      <MemoryRouter initialEntries={["/organizer"]}>
        <Routes>
          <Route path="/organizer" element={<OrganizerLogin />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: "Need access? Create account" }))
    await user.type(screen.getByLabelText("Email"), "creator@example.com")
    await user.type(screen.getByLabelText("Password"), "creatorpass")
    await user.click(screen.getByRole("button", { name: "Create account" }))

    await waitFor(() => expect(apiMock.register).toHaveBeenCalledWith("creator@example.com", "creatorpass", "ORGANIZER"))
    expect(setTokenMock).toHaveBeenCalledWith("org-token")
    expect(navigateMock).toHaveBeenCalledWith("/organizer/dashboard")
  })
})
