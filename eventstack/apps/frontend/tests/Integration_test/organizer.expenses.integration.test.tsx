import { act } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import BudgetBot from "../../src/components/BudgetBot"

(globalThis as any).scrollTo = () => {}

const apiMock = vi.hoisted(() => ({
  listEventExpenses: vi.fn(),
  createEventExpense: vi.fn(),
  updateEventExpense: vi.fn(),
  deleteEventExpense: vi.fn(),
  askBudgetBot: vi.fn(),
}))

vi.mock("../../src/lib/api", () => ({
  api: apiMock,
}))

const quickPrompts = [
  "What are my largest spending risks?",
  "Which payments should I prioritize next?",
  "Explain the variance between planned and actual spend.",
  "Summarize committed costs that still have 0 actual spend.",
]

const initialExpense = {
  id: "exp-1",
  label: "Lighting rig",
  category: "Production",
  vendor: "Light Co",
  quantity: 3,
  estimatedCost: 4500,
  actualCost: 4200,
  status: "COMMITTED" as const,
  incurredOn: "2024-04-25",
  notes: "Includes setup fees",
}

const updatedExpense = {
  ...initialExpense,
  label: "Lighting rig (edited)",
  actualCost: 4800,
  status: "PAID" as const,
}

const newExpense = {
  id: "exp-2",
  label: "Catering advance",
  category: "Hospitality",
  vendor: "Chef Co",
  quantity: 1,
  estimatedCost: 2500,
  actualCost: 0,
  status: "PLANNED" as const,
  incurredOn: "2024-05-10",
  notes: "",
}

const eventMeta = {
  id: "evt-1",
  title: "Summit Live",
  startsAt: "2024-06-01T10:00:00.000Z",
  venueName: "Grand Hall",
}

const initialSummary = {
  plannedTotal: 4500,
  actualTotal: 4200,
  variance: -300,
  itemCount: 1,
  averageActual: 4200,
  byCategory: [{ category: "Production", planned: 4500, actual: 4200 }],
  byStatus: [{ status: "COMMITTED", total: 4200 }],
}

const updatedSummary = {
  plannedTotal: 4500,
  actualTotal: 4800,
  variance: 300,
  itemCount: 1,
  averageActual: 4800,
  byCategory: [{ category: "Production", planned: 4500, actual: 4800 }],
  byStatus: [{ status: "PAID", total: 4800 }],
}

const afterCreateSummary = {
  plannedTotal: 7000,
  actualTotal: 4800,
  variance: -2200,
  itemCount: 2,
  averageActual: 2400,
  byCategory: [
    { category: "Production", planned: 4500, actual: 4800 },
    { category: "Hospitality", planned: 2500, actual: 0 },
  ],
  byStatus: [
    { status: "PAID", total: 4800 },
    { status: "PLANNED", total: 0 },
  ],
}

const afterDeleteSummary = {
  plannedTotal: 4500,
  actualTotal: 4800,
  variance: 300,
  itemCount: 1,
  averageActual: 4800,
  byCategory: [{ category: "Production", planned: 4500, actual: 4800 }],
  byStatus: [{ status: "PAID", total: 4800 }],
}

const initialResponse = {
  event: eventMeta,
  items: [initialExpense],
  summary: initialSummary,
}

const updatedResponse = {
  event: eventMeta,
  items: [updatedExpense],
  summary: updatedSummary,
}

const afterCreateResponse = {
  event: eventMeta,
  items: [updatedExpense, newExpense],
  summary: afterCreateSummary,
}

const afterDeleteResponse = {
  event: eventMeta,
  items: [updatedExpense],
  summary: afterDeleteSummary,
}

const originalRaf = globalThis.requestAnimationFrame
const originalScrollTo = window.scrollTo
let confirmSpy: ReturnType<typeof vi.spyOn> | null = null

let scrollSpy: ReturnType<typeof vi.spyOn> | null = null

describe("Organizer expense integration", () => {
  beforeEach(() => {
    Object.values(apiMock).forEach((fn) => fn.mockReset())
    ;(globalThis.requestAnimationFrame as any) = (cb: FrameRequestCallback) => {
      cb(performance.now())
      return 1
    }
    scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {})
    confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true)
  })

  afterEach(() => {
    confirmSpy?.mockRestore()
    confirmSpy = null
    scrollSpy?.mockRestore()
    scrollSpy = null
    window.scrollTo = originalScrollTo
    ;(globalThis as any).scrollTo = originalScrollTo
    ;(globalThis.requestAnimationFrame as any) = originalRaf
  })

  it(
    "manages organizer expenses lifecycle and handles failures",
    async () => {
    const user = userEvent.setup()

    apiMock.listEventExpenses
      .mockResolvedValueOnce(initialResponse)
      .mockResolvedValueOnce(updatedResponse)
      .mockResolvedValueOnce(afterCreateResponse)
      .mockResolvedValueOnce(afterDeleteResponse)
      .mockRejectedValueOnce(new Error("Network down"))
      .mockResolvedValue(afterDeleteResponse)

    apiMock.createEventExpense.mockResolvedValue({ id: "exp-2" })
    apiMock.updateEventExpense.mockImplementation(async (...args) => {
      console.info("update called with", args)
      return { id: "exp-1" }
    })
    apiMock.deleteEventExpense.mockResolvedValue({ id: "exp-2" })
    apiMock.askBudgetBot.mockResolvedValue({ message: "" })

    const EventExpenses = (await import("../../src/routes/organizer/EventExpenses")).default

    render(
      <MemoryRouter initialEntries={["/organizer/events/evt-1/expenses"]}>
        <Routes>
          <Route path="/organizer/events/:id/expenses" element={<EventExpenses />} />
        </Routes>
      </MemoryRouter>,
    )

    console.info("Rendered EventExpenses")
    expect(await screen.findByText("Expense ledger")).toBeTruthy()
    console.info("Initial ledger displayed")
    expect(screen.getByText("Lighting rig")).toBeTruthy()
    expect(screen.getByText("Planned spend")).toBeTruthy()

    const editButton = within(screen.getByText("Lighting rig").closest("tr") as HTMLTableRowElement).getByRole(
      "button",
      { name: "Edit" },
    )
    fireEvent.click(editButton)
    console.info("Clicked edit")

    const labelInput = screen.getByLabelText("Expense label") as HTMLInputElement
    const actualInput = screen.getByLabelText("Actual cost") as HTMLInputElement
    const statusSelect = screen.getByLabelText("Status") as HTMLSelectElement

    expect(labelInput.value).toBe("Lighting rig")

    await user.clear(labelInput)
    await user.type(labelInput, "Lighting rig (edited)")
    await user.clear(actualInput)
    await user.type(actualInput, "4800")
    await user.selectOptions(statusSelect, "PAID")

    fireEvent.click(screen.getByRole("button", { name: "Update expense" }))

    await waitFor(() => expect(apiMock.updateEventExpense).toHaveBeenCalledTimes(1))
    console.info("Updated expense call asserted")
    expect(apiMock.updateEventExpense.mock.calls[0][0]).toBe("evt-1")
    expect(apiMock.updateEventExpense.mock.calls[0][1]).toBe("exp-1")
    expect(apiMock.updateEventExpense.mock.calls[0][2]).toMatchObject({
      actualCost: 4800,
      status: "PAID",
    })

    await waitFor(() => expect(screen.getByText("Lighting rig (edited)")).toBeTruthy())

    await user.type(labelInput, "Catering advance")
    await user.clear(screen.getByLabelText("Category"))
    await user.type(screen.getByLabelText("Category"), "Hospitality")
    await user.type(screen.getByLabelText("Vendor / partner"), "Chef Co")
    await user.clear(screen.getByLabelText("Quantity"))
    await user.type(screen.getByLabelText("Quantity"), "1")
    await user.clear(screen.getByLabelText("Planned cost"))
    await user.type(screen.getByLabelText("Planned cost"), "2500")
    await user.clear(screen.getByLabelText("Actual cost"))
    await user.type(screen.getByLabelText("Actual cost"), "0")
    await user.clear(screen.getByLabelText("Incurred on"))
    await user.type(screen.getByLabelText("Incurred on") as HTMLInputElement, "2024-05-10")

    fireEvent.click(screen.getByRole("button", { name: "Add expense" }))

    await waitFor(() => expect(apiMock.createEventExpense).toHaveBeenCalledTimes(1))
    expect(apiMock.createEventExpense.mock.calls[0][0]).toBe("evt-1")
    expect(apiMock.createEventExpense.mock.calls[0][1]).toMatchObject({
      label: "Catering advance",
      estimatedCost: 2500,
    })

    expect(await screen.findByText("Catering advance")).toBeTruthy()
    console.info("Created expense appears")

    const newRow = screen.getByText("Catering advance").closest("tr") as HTMLTableRowElement
    const deleteButton = within(newRow).getByRole("button", { name: "Delete" })
    fireEvent.click(deleteButton)

    await waitFor(() => expect(apiMock.deleteEventExpense).toHaveBeenCalledWith("evt-1", "exp-2"))
    console.info("Delete called")
    expect(confirmSpy).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText("Catering advance")).toBeNull())

    const refreshButton = screen.getByRole("button", { name: "Refresh" })
    fireEvent.click(refreshButton)

    await waitFor(() => expect(screen.getByText("Network down")).toBeTruthy())
    console.info("Refresh error surfaced")
    },
    15000,
  )

  it(
    "opens, chats with and closes Budget Bot assistance",
    async () => {
    const user = userEvent.setup()

    apiMock.askBudgetBot
      .mockResolvedValueOnce({ message: "**Budget** insight\r\n- Check _figures_\n" })
      .mockRejectedValueOnce(new Error("AI offline"))

    render(
      <BudgetBot
        eventId="evt-1"
        eventTitle="Summit Live"
        eventStartsAt="2024-06-01T10:00:00.000Z"
        venueName="Grand Hall"
        summary={initialSummary}
        items={[initialExpense, { ...initialExpense, id: "exp-2", label: "Catering", actualCost: 0 }]}
      />,
    )

    console.info("Rendered BudgetBot")
    const launcher = screen.getByRole("button", { name: /Ask Budget Bot/i })
    act(() => {
      fireEvent.click(launcher)
    })

    const panel = await screen.findByRole("dialog", { name: "Budget Bot assistant" })
    expect(panel).toBeTruthy()
    console.info("BudgetBot panel open")

    const firstPrompt = screen.getByRole("button", { name: quickPrompts[0] })
    act(() => {
      fireEvent.click(firstPrompt)
    })

    await waitFor(() => expect(apiMock.askBudgetBot).toHaveBeenCalledTimes(1))
    expect(apiMock.askBudgetBot.mock.calls[0][1].prompt).toContain("Respond in plain text")
    expect(await screen.findByText(/Budget insight/)).toBeTruthy()
    console.info("BudgetBot prompt response received")

    const input = screen.getByPlaceholderText("Ask anything about this event's budget...")
    await user.type(input, "How is variance trending?")
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Send" }))
    })

    await waitFor(() => expect(apiMock.askBudgetBot).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByText("AI offline")).toBeTruthy())
    expect(screen.getByText("Unable to generate a response right now. Please try again shortly.")).toBeTruthy()
    console.info("BudgetBot error path exercised")

    const closeButton = screen.getByRole("button", { name: "Close Budget Bot" })
    act(() => {
      fireEvent.click(closeButton)
    })

    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(screen.queryByRole("dialog", { name: "Budget Bot assistant" })).toBeNull()
    expect(launcher.getAttribute("aria-expanded")).toBe("false")
    console.info("BudgetBot closed")
    },
    15000,
  )
})



