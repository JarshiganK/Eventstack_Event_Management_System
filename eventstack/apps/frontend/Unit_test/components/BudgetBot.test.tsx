import { beforeEach, describe, expect, it, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { render, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

const apiMock = {
  askBudgetBot: vi.fn(),
}

vi.mock("../../src/lib/api", () => ({
  api: apiMock,
}))

const summary = {
  plannedTotal: 5000,
  actualTotal: 4200,
  variance: -800,
  itemCount: 2,
  averageActual: 2100,
  byCategory: [{ category: "Logistics", planned: 3000, actual: 2600 }],
  byStatus: [{ status: "PAID", total: 2400 }],
}

const items = [
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
]

async function renderBot() {
  const Component = (await import("../../src/components/BudgetBot")).default
  let view: ReturnType<typeof render>
  await act(async () => {
    view = render(
      <MemoryRouter>
        <Component
          eventId="evt-1"
          eventTitle="Gala Night"
          eventStartsAt="2024-05-01T18:00:00.000Z"
          venueName="Main Hall"
          summary={summary}
          items={items}
        />
      </MemoryRouter>
    )
  })
  // @ts-expect-error view assigned in act
  return view as ReturnType<typeof render>
}

beforeEach(() => {
  apiMock.askBudgetBot.mockReset()
  apiMock.askBudgetBot.mockResolvedValue({ message: "Assistant response" })
})

describe("components/BudgetBot", () => {
  it("opens the panel and sends a quick prompt", async () => {
    const user = userEvent.setup()
    const view = await renderBot()

    await user.click(view.getByRole("button", { name: /^Budget Bot$/ }))

    const quickPrompt = "What are my largest spending risks?"
    await user.click(await view.findByRole("button", { name: quickPrompt }))

    await waitFor(() => expect(apiMock.askBudgetBot).toHaveBeenCalledTimes(1))
    expect(apiMock.askBudgetBot).toHaveBeenCalledWith(
      "evt-1",
      expect.objectContaining({
        prompt: quickPrompt,
        context: expect.stringContaining("Gala Night"),
      }),
    )

    await waitFor(() => expect(view.getByText("Assistant response")).toBeDefined())
    const history = apiMock.askBudgetBot.mock.calls[0][1].history
    expect(Array.isArray(history)).toBe(true)
    expect(history).toHaveLength(1)
    expect(history?.[0]).toEqual(expect.objectContaining({ role: "user", content: quickPrompt }))
  })

  it("submits manual questions and clears the input", async () => {
    const user = userEvent.setup()
    const view = await renderBot()

    await user.click(view.getByRole("button", { name: /^Budget Bot$/ }))

    const input = view.getByPlaceholderText(/Ask anything about this event/i) as HTMLInputElement
    await user.type(input, "Check variance status")

    const sendButton = view.getByRole("button", { name: "Send" })
    expect((sendButton as HTMLButtonElement).disabled).toBe(false)

    await user.click(sendButton)

    await waitFor(() => expect(apiMock.askBudgetBot).toHaveBeenCalledWith(
      "evt-1",
      expect.objectContaining({ prompt: "Check variance status" }),
    ))
    await waitFor(() => expect(input.value).toBe(""))
  })

  it("shows error feedback when the bot call fails", async () => {
    apiMock.askBudgetBot.mockRejectedValueOnce(new Error("Service down"))

    const user = userEvent.setup()
    const view = await renderBot()

    await user.click(view.getByRole("button", { name: /^Budget Bot$/ }))

    const input = view.getByPlaceholderText(/Ask anything about this event/i)
    await user.type(input, "Test failure")

    await user.click(view.getByRole("button", { name: "Send" }))

    await waitFor(() => expect(apiMock.askBudgetBot).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(view.getByText("Service down")).toBeDefined())
    await waitFor(() => expect(view.getByText(/Unable to generate a response right now/)).toBeDefined())
  })
})
