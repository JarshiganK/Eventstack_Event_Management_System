import { beforeEach, describe, expect, it, vi } from "vitest";

const httpMock = vi.fn();

vi.mock("../../../../src/lib/http.js", () => ({
  http: httpMock,
}));

describe("lib/api/events", () => {
  beforeEach(() => {
    httpMock.mockReset();
  });

  it("lists events with optional filters", async () => {
    httpMock.mockResolvedValue([]);
    const { listEvents } = await import("../../../../src/lib/api/events.js");
    await listEvents({ from: "2024-01-01", category: "MUSIC" });
    expect(httpMock).toHaveBeenCalledWith(
      "/events?from=2024-01-01&category=MUSIC",
    );
  });

  it("requests single event details", async () => {
    httpMock.mockResolvedValue({});
    const { getEvent } = await import("../../../../src/lib/api/events.js");
    await getEvent("evt-1");
    expect(httpMock).toHaveBeenCalledWith("/events/evt-1");
  });

  it("creates, updates, deletes and adds images", async () => {
    httpMock.mockResolvedValue({ id: "evt-1" });
    const { createEvent, updateEvent, deleteEvent, addEventImage } = await import(
      "../../../../src/lib/api/events.js"
    );

    await createEvent({
      title: "Title",
      startsAt: "2024-01-01",
      endsAt: "2024-01-02",
      summary: "",
      venueName: "Venue",
    });
    expect(httpMock).toHaveBeenCalledWith(
      "/admin/events",
      expect.objectContaining({ method: "POST" }),
    );

    httpMock.mockResolvedValue({ id: "evt-1" });
    await updateEvent("evt-1", {
      title: "Updated",
      startsAt: "2024-01-01",
      endsAt: "2024-01-02",
      summary: "",
      venueName: "Venue",
    });
    expect(httpMock).toHaveBeenCalledWith(
      "/admin/events/evt-1",
      expect.objectContaining({ method: "PUT" }),
    );

    httpMock.mockResolvedValue({});
    await addEventImage("evt-1", { url: "img.png" });
    expect(httpMock).toHaveBeenCalledWith(
      "/admin/events/evt-1/images",
      expect.objectContaining({ method: "POST" }),
    );

    httpMock.mockResolvedValue({});
    await deleteEvent("evt-1");
    expect(httpMock).toHaveBeenCalledWith(
      "/admin/events/evt-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
