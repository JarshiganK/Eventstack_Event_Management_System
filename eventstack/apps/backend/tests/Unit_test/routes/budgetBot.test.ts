import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => ({
  requireOrganizerOrAdmin: vi.fn(),
  env: { GEMINI_API_KEY: "ai-key" },
  fetch: vi.fn(),
}));

vi.mock("../../../src/auth.js", () => ({
  requireOrganizerOrAdmin: mocks.requireOrganizerOrAdmin,
}));

vi.mock("../../../src/env.js", () => ({
  env: mocks.env,
}));

beforeEach(() => {
  mocks.requireOrganizerOrAdmin.mockReset();
  mocks.fetch.mockReset();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.env.GEMINI_API_KEY = "ai-key";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function extractHandler(handlers: ReturnType<typeof createMockFastify>["handlers"]) {
  const call = handlers.post.mock.calls.find(([path]) => path === "/events/:eventId/budget-bot");
  if (!call) throw new Error("Budget bot route not registered");
  return call[2] as (req: any, reply: any) => Promise<any>;
}

function createReply() {
  return {
    statusCode: undefined as number | undefined,
    payload: undefined as unknown,
    code(this: any, status: number) {
      this.statusCode = status;
      return this;
    },
    send(this: any, body: unknown) {
      this.payload = body;
      return this;
    },
  };
}

describe("routes/budgetBot", () => {
  it("registers the AI endpoint with access control", async () => {
    const { app, handlers } = createMockFastify();
    const register = (await import("../../../src/routes/budgetBot.js")).default;

    await register(app);

    const postCalls = handlers.post.mock.calls.filter(([path]) => path === "/events/:eventId/budget-bot");
    expect(postCalls).toHaveLength(1);
    expect(postCalls[0]?.[1]).toEqual({ preHandler: mocks.requireOrganizerOrAdmin });
  });

  it("calls Gemini API and returns its response", async () => {
    const { app, handlers } = createMockFastify();
    const register = (await import("../../../src/routes/budgetBot.js")).default;
    await register(app);

    const contextBlock = "start-" + "x".repeat(13000);
    const expectedResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: "First line" }, { text: "Second line" }],
          },
        },
      ],
    };

    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => expectedResponse,
      text: async () => "",
    } as any);

    const handler = extractHandler(handlers);

    const result = await handler(
      {
        params: { eventId: "evt-1" },
        body: {
          prompt: "Where should we cut costs?",
          context: contextBlock,
          history: [
            { role: "user", content: "Hi" },
            { role: "assistant", content: "Hello" },
          ],
        },
      },
      createReply(),
    );

    expect(result).toEqual({ message: "First line\nSecond line" });
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = mocks.fetch.mock.calls[0];
    expect(url).toContain("gemini-2.5-flash");
    expect(url).toContain("key=ai-key");
    expect((options as any).method).toBe("POST");

    const requestBody = JSON.parse((options as any).body);
    expect(requestBody.contents).toHaveLength(4);
    const snapshotEntry = requestBody.contents[0];
    expect(snapshotEntry.parts[0].text).toContain("Event data snapshot:");
    const trimmedSegment = snapshotEntry.parts[0].text.split("Event data snapshot:\n")[1] ?? "";
    expect(trimmedSegment.endsWith(contextBlock.slice(-12000))).toBe(true);
    const finalEntry = requestBody.contents.at(-1);
    expect(finalEntry.parts[0].text).toBe("Where should we cut costs?");
  });

  it("returns 500 when Gemini is misconfigured", async () => {
    const { app, handlers } = createMockFastify();
    const register = (await import("../../../src/routes/budgetBot.js")).default;
    await register(app);
    mocks.env.GEMINI_API_KEY = "";

    const handler = extractHandler(handlers);
    const reply = createReply();
    await handler(
      {
        params: { eventId: "evt-1" },
        body: { prompt: "Hello", context: "data" },
      },
      reply,
    );

    expect(reply.statusCode).toBe(500);
    expect(reply.payload).toEqual({ error: "Gemini API key missing" });
  });
});
