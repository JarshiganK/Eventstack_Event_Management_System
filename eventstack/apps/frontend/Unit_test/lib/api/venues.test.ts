import { beforeEach, describe, expect, it, vi } from "vitest";

const httpMock = vi.fn();

vi.mock("../../../src/lib/http.js", () => ({
  http: httpMock,
}));

describe("lib/api/venues", () => {
  beforeEach(() => {
    httpMock.mockReset();
  });

  it("lists venues", async () => {
    httpMock.mockResolvedValue([]);
    const { listVenues } = await import("../../../src/lib/api/venues.js");
    await listVenues();
    expect(httpMock).toHaveBeenCalledWith("/venues");
  });

  it("creates, updates and deletes venues", async () => {
    httpMock.mockResolvedValue({ id: "v1" });
    const { createVenue, updateVenue, deleteVenue } = await import("../../../src/lib/api/venues.js");

    await createVenue({ name: "Hall" });
    expect(httpMock).toHaveBeenCalledWith(
      "/admin/venues",
      expect.objectContaining({ method: "POST" }),
    );

    httpMock.mockResolvedValue({ id: "v1" });
    await updateVenue("v1", { name: "Updated" });
    expect(httpMock).toHaveBeenCalledWith(
      "/admin/venues/v1",
      expect.objectContaining({ method: "PUT" }),
    );

    httpMock.mockResolvedValue({ id: "v1" });
    await deleteVenue("v1");
    expect(httpMock).toHaveBeenCalledWith(
      "/admin/venues/v1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
