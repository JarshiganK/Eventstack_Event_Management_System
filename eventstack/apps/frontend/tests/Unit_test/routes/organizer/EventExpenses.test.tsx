import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { render, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const apiMock = {
  listEventExpenses: vi.fn(),
  createEventExpense: vi.fn(),
  updateEventExpense: vi.fn(),
  deleteEventExpense: vi.fn(),
}

vi.mock("../../../../src/lib/api", () => ({
  api: apiMock,
}))

vi.mock("../../../../src/components/BackLink", () => ({
  default: () => <div data-testid="back-link" />,
}))

vi.mock("../../../../src/components/BudgetBot", () => ({
  default: () => <div data-testid="budget-bot" />,
}))

type RenderResult = Awaited<ReturnType<typeof renderExpenses>>

const baseResponse = {
  event: {
    id: "evt-1",
    title: "Gala Night",
    startsAt: "2024-05-01T18:00:00.000Z",
    venueName: "Main Hall",
  },
  summary: {
    plannedTotal: 5000,
    actualTotal: 4200,
    variance: -800,
    itemCount: 2,
    averageActual: 2100,
    byCategory: [
      { category: "Logistics", planned: 3000, actual: 2600 },
      { category: "Marketing", planned: 2000, actual: 1600 },
    ],
    byStatus: [
      { status: "PLANNED", total: 1800 },
      { status: "PAID", total: 2400 },
    ],
  },
  items: [
    {
      id: "exp-1",
      label: "Sound system",
      category: "Logistics",
      vendor: "Acme Audio",
      quantity: 2,
      estimatedCost: 2000,
      actualCost: 2500,
      status: "PAID" as const,
      incurredOn: "2024-04-01",
      notes: "Deposit paid",
    },
    {
      id: "exp-2",
      label: "Billboards",
      category: "Marketing",
      vendor: "Billboard Co",
      quantity: 5,
      estimatedCost: 3000,
      actualCost: 1700,
      status: "PLANNED" as const,
      incurredOn: "2024-04-10",
      notes: "Awaiting approval",
    },
  ],
}

beforeAll(() => {
  // jsdom does not implement scrollTo; stub to avoid errors when edit starts
  // @ts-expect-error - provide stub implementation for tests
  if (!window.scrollTo) window.scrollTo = () => {}
})

beforeEach(() => {
  vi.resetModules()
  for (const fn of Object.values(apiMock)) {
    fn.mockReset()
  }
  apiMock.listEventExpenses.mockResolvedValue(baseResponse)
  apiMock.createEventExpense.mockResolvedValue({ id: "exp-new" })
  apiMock.updateEventExpense.mockResolvedValue({ id: "exp-1" })
  apiMock.deleteEventExpense.mockResolvedValue({ id: "exp-1" })
  vi.stubGlobal("confirm", vi.fn().mockReturnValue(true))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function renderExpenses() {
  const Component = (await import("../../../../src/routes/organizer/EventExpenses")).default
  return render(
    <MemoryRouter initialEntries={["/organizer/events/evt-1/expenses"]}>
      <Routes>
        <Route path="/organizer/events/:id/expenses" element={<Component />} />
      </Routes>
    </MemoryRouter>
  )
}

async function waitForInitialLoad(result: RenderResult) {
  await waitFor(() => expect(apiMock.listEventExpenses).toHaveBeenCalledTimes(1))
  await result.findByText("Gala Night")
}

describe("routes/organizer/EventExpenses", () => {
  it("loads expenses and renders summary data", async () => {
    const view = await renderExpenses()
    await waitForInitialLoad(view)

    expect(view.getByText("Expense ledger")).toBeDefined()
    expect(view.getByText("Planned spend")).toBeDefined()
    expect(view.getByText("Actual spend")).toBeDefined()
    expect(view.getByText(/Across 2 items/)).toBeDefined()
    expect(view.getByText("Sound system")).toBeDefined()
    expect(view.getAllByText("Logistics")[0]).toBeDefined()
  })

  it("creates a new expense entry from the form", async () => {
    const user = userEvent.setup()
    const view = await renderExpenses()
    await waitForInitialLoad(view)

    const labelInput = view.getByLabelText("Expense label") as HTMLInputElement
    const categoryInput = view.getByLabelText("Category") as HTMLInputElement
    const vendorInput = view.getByLabelText("Vendor / partner") as HTMLInputElement
    const quantityInput = view.getByLabelText("Quantity") as HTMLInputElement
    const plannedInput = view.getByLabelText("Planned cost") as HTMLInputElement
    const actualInput = view.getByLabelText("Actual cost") as HTMLInputElement
    const statusSelect = view.getByLabelText("Status") as HTMLSelectElement
    const incurredInput = view.getByLabelText("Incurred on") as HTMLInputElement
    const notesInput = view.getByLabelText("Notes") as HTMLTextAreaElement

    await user.type(labelInput, " Stage Lighting ")
    await user.clear(categoryInput)
    await user.type(categoryInput, "Production ")
    await user.type(vendorInput, " Vendor Inc ")
    await user.clear(quantityInput)
    await user.type(quantityInput, "2")
    await user.type(plannedInput, "500")
    await user.type(actualInput, "450")
    await user.selectOptions(statusSelect, "PAID")
    await user.type(incurredInput, "2024-04-20")
    await user.type(notesInput, " Lighting rig deposit ")

    await user.click(view.getByRole("button", { name: "Add expense" }))

    await waitFor(() => expect(apiMock.createEventExpense).toHaveBeenCalledTimes(1))
    expect(apiMock.createEventExpense).toHaveBeenCalledWith(
      "evt-1",
      expect.objectContaining({
        label: "Stage Lighting",
        category: "Production",
        vendor: "Vendor Inc",
        quantity: 2,
        estimatedCost: 500,
        actualCost: 450,
        status: "PAID",
        incurredOn: "2024-04-20",
        notes: "Lighting rig deposit",
      })
    )
    await waitFor(() => expect(apiMock.listEventExpenses).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(labelInput.value).toBe(""))
  })

  it("enters edit mode and updates an existing expense", async () => {
    const user = userEvent.setup()
    const view = await renderExpenses()
    await waitForInitialLoad(view)

    await user.click(view.getAllByRole("button", { name: "Edit" })[0])

    const labelInput = view.getByLabelText("Expense label") as HTMLInputElement
    await waitFor(() => expect(labelInput.value).toBe("Sound system"))

    await user.clear(labelInput)
    await user.type(labelInput, "Updated sound system")
    await user.click(view.getByRole("button", { name: "Update expense" }))

    await waitFor(() => expect(apiMock.updateEventExpense).toHaveBeenCalledTimes(1))
    expect(apiMock.updateEventExpense).toHaveBeenCalledWith(
      "evt-1",
      "exp-1",
      expect.objectContaining({
        label: "Updated sound system",
      })
    )
    await waitFor(() => expect(apiMock.listEventExpenses).toHaveBeenCalledTimes(2))
  })

  it("removes an expense after confirmation", async () => {
    const confirmSpy = window.confirm as unknown as vi.Mock
    confirmSpy.mockReturnValue(true)

    const user = userEvent.setup()
    const view = await renderExpenses()
    await waitForInitialLoad(view)

    await user.click(view.getAllByRole("button", { name: "Delete" })[0])

    await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(apiMock.deleteEventExpense).toHaveBeenCalledWith("evt-1", "exp-1"))
  })

  it("shows an error when loading expenses fails", async () => {
    apiMock.listEventExpenses.mockRejectedValueOnce(new Error("Boom"))
    const view = await renderExpenses()
    await waitFor(() => expect(view.getByText("Boom")).toBeDefined())
  })
})
