import { describe, expect, it, vi } from "vitest";

const httpMock = vi.fn();

vi.mock("../../../src/lib/http.js", () => ({
  http: httpMock,
}));

describe("lib/api/events", () => {
  it("lists events with optional filters", async () => {
    httpMock.mockResolvedValue([]);
    const { listEvents } = await import("../../../src/lib/api/events.js");
    await listEvents({ from: "2024-01-01", category: "MUSIC" });
    expect(httpMock).toHaveBeenCalledWith(
      "/events?from=2024-01-01&category=MUSIC",
    );
  });

  it("requests single event details", async () => {
    httpMock.mockResolvedValue({});
    const { getEvent } = await import("../../../src/lib/api/events.js");
    await getEvent("evt-1");
    expect(httpMock).toHaveBeenCalledWith("/events/evt-1");
  });
});
