import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const navigateMock = vi.hoisted(() => vi.fn())

const apiMock = vi.hoisted(() => ({
  createEvent: vi.fn(),
  uploadFile: vi.fn(),
  addEventImage: vi.fn(),
}))

vi.mock("../../src/lib/api", () => ({
  api: apiMock,
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom")
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

describe("Admin event creation integration", () => {
  beforeEach(() => {
    navigateMock.mockReset()
    Object.values(apiMock).forEach(fn => fn.mockReset())
    vi.useRealTimers()
  })

  async function renderEventNew() {
    const Component = (await import("../../src/routes/admin/EventNew")).default
    return render(
      <MemoryRouter initialEntries={["/admin/events/new"]}>
        <Routes>
          <Route path="/admin/events/new" element={<Component />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it("submits event details with optional cover upload and redirects after confirm", async () => {
    vi.useFakeTimers()
    apiMock.createEvent.mockResolvedValueOnce({ id: "evt-100" })
    apiMock.uploadFile.mockResolvedValueOnce({ url: "/uploads/cover.png" })
    apiMock.addEventImage.mockResolvedValueOnce({ ok: true })

    const user = userEvent.setup()
    await renderEventNew()

    await user.type(screen.getByLabelText("Title"), "Launch Party")
    await user.type(screen.getByLabelText("Summary"), "Celebrate the new release.")

    fireEvent.change(screen.getByLabelText("Starts at"), { target: { value: "2024-08-01T18:00" } })
    fireEvent.change(screen.getByLabelText("Ends at"), { target: { value: "2024-08-01T20:00" } })

    await user.type(screen.getByLabelText("Venue"), "Skyline Loft")
    await user.type(screen.getByLabelText("Categories"), "music,nightlife")

    const fileInput = screen.getByLabelText("Cover image")
    const coverFile = new File(["binary"], "cover.png", { type: "image/png" })
    await user.upload(fileInput, coverFile)

    await user.click(screen.getByRole("button", { name: "Create event" }))

    await waitFor(() =>
      expect(apiMock.createEvent).toHaveBeenCalledWith({
        title: "Launch Party",
        summary: "Celebrate the new release.",
        startsAt: "2024-08-01T18:00",
        endsAt: "2024-08-01T20:00",
        venueName: "Skyline Loft",
        categoriesCsv: "music,nightlife",
      }),
    )

    await waitFor(() => expect(apiMock.uploadFile).toHaveBeenCalledWith(coverFile))
    await waitFor(() => expect(apiMock.addEventImage).toHaveBeenCalledWith("evt-100", { url: "/uploads/cover.png" }))

    expect(await screen.findByText("Event created")).toBeTruthy()

    await vi.runOnlyPendingTimersAsync()
    expect(navigateMock).toHaveBeenCalledWith("/organizer/dashboard")
    vi.useRealTimers()
  })

  it("shows upload warning when cover upload fails", async () => {
    apiMock.createEvent.mockResolvedValueOnce({ id: "evt-42" })
    apiMock.uploadFile.mockRejectedValueOnce(new Error("Upload failed"))

    const user = userEvent.setup()
    await renderEventNew()

    await user.type(screen.getByLabelText("Title"), "Backup Expo")
    fireEvent.change(screen.getByLabelText("Starts at"), { target: { value: "2024-09-10T09:00" } })
    fireEvent.change(screen.getByLabelText("Ends at"), { target: { value: "2024-09-10T10:00" } })
    await user.type(screen.getByLabelText("Venue"), "Main Stage")

    const fileInput = screen.getByLabelText("Cover image")
    await user.upload(fileInput, new File(["content"], "cover.jpg", { type: "image/jpeg" }))

    await user.click(screen.getByRole("button", { name: "Create event" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Event saved, but we could not attach the image")
    expect(apiMock.addEventImage).not.toHaveBeenCalled()
  })

  it("surfaces create errors without redirecting", async () => {
    apiMock.createEvent.mockRejectedValueOnce(new Error('{"message":"Duplicate title"}'))

    const user = userEvent.setup()
    await renderEventNew()

    await user.type(screen.getByLabelText("Title"), "Duplicate Show")
    fireEvent.change(screen.getByLabelText("Starts at"), { target: { value: "2024-07-01T18:00" } })
    fireEvent.change(screen.getByLabelText("Ends at"), { target: { value: "2024-07-01T19:00" } })
    await user.type(screen.getByLabelText("Venue"), "River Hall")

    await user.click(screen.getByRole("button", { name: "Create event" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Duplicate title")
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
