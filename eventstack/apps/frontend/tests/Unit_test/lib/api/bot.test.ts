import { beforeEach, describe, expect, it, vi } from "vitest"

const httpMock = vi.fn()

vi.mock("../../../../src/lib/http", () => ({
  http: httpMock,
}))

describe("lib/api/bot", () => {
  beforeEach(() => {
    httpMock.mockReset()
  })

  it("sends budget bot prompts with payload", async () => {
    httpMock.mockResolvedValue({ message: "Hi" })
    const { askBudgetBot } = await import("../../../../src/lib/api/bot")

    const payload = {
      prompt: "Help me budget",
      context: "Event context",
      history: [{ role: "user", content: "hello" }],
    }

    await askBudgetBot("evt-1", payload)

    expect(httpMock).toHaveBeenCalledWith(
      "/events/evt-1/budget-bot",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    )
  })
})
