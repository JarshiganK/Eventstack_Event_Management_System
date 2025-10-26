import { describe, expect, it, vi } from "vitest";

const httpMock = vi.fn();

vi.mock("../../../src/lib/http.js", () => ({
  http: httpMock,
}));

describe("lib/api/venues", () => {
  it("lists venues", async () => {
    httpMock.mockResolvedValue([]);
    const { listVenues } = await import("../../../src/lib/api/venues.js");
    await listVenues();
    expect(httpMock).toHaveBeenCalledWith("/venues");
  });
});
