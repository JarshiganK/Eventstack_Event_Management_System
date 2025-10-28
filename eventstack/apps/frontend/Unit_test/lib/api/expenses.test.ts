import { beforeEach, describe, expect, it, vi } from "vitest"

const httpMock = vi.fn()

vi.mock("../../../src/lib/http", () => ({
  http: httpMock,
}))

describe("lib/api/expenses", () => {
  beforeEach(() => {
    httpMock.mockReset()
  })

  it("lists event expenses", async () => {
    httpMock.mockResolvedValue({})
    const { listEventExpenses } = await import("../../../src/lib/api/expenses")

    await listEventExpenses("evt-1")

    expect(httpMock).toHaveBeenCalledWith("/events/evt-1/expenses")
  })

  it("creates an expense", async () => {
    httpMock.mockResolvedValue({ id: "exp-1" })
    const { createEventExpense } = await import("../../../src/lib/api/expenses")
    const payload = {
      label: "Catering",
      category: "food",
      vendor: "Vendor",
      quantity: 1,
      estimatedCost: 1000,
      actualCost: 900,
      status: "PAID",
    }

    await createEventExpense("evt-1", payload)

    expect(httpMock).toHaveBeenCalledWith(
      "/events/evt-1/expenses",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    )
  })

  it("updates an expense", async () => {
    httpMock.mockResolvedValue({ id: "exp-1" })
    const { updateEventExpense } = await import("../../../src/lib/api/expenses")
    const payload = {
      label: "Updated",
      category: "marketing",
      vendor: null,
      quantity: 2,
      estimatedCost: 500,
      actualCost: 400,
      status: "COMMITTED",
    }

    await updateEventExpense("evt-1", "exp-1", payload)

    expect(httpMock).toHaveBeenCalledWith(
      "/events/evt-1/expenses/exp-1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    )
  })

  it("deletes an expense", async () => {
    httpMock.mockResolvedValue({ id: "exp-1" })
    const { deleteEventExpense } = await import("../../../src/lib/api/expenses")

    await deleteEventExpense("evt-1", "exp-1")

    expect(httpMock).toHaveBeenCalledWith(
      "/events/evt-1/expenses/exp-1",
      expect.objectContaining({ method: "DELETE" }),
    )
  })
})
