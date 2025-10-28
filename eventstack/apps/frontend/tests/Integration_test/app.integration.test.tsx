import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiMock = {
  listEvents: vi.fn(),
  search: vi.fn(),
};

vi.mock("../../src/lib/api", () => ({
  api: apiMock,
}));

describe("App integration", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.values(apiMock).forEach(fn => fn.mockReset());
    apiMock.listEvents.mockResolvedValue([
      {
        id: "evt-1",
        title: "Jazz Night",
        startsAt: "2024-05-01T18:00:00.000Z",
        endsAt: "2024-05-01T21:00:00.000Z",
        categories: ["music"],
        coverUrl: "/uploads/jazz.jpg",
        summary: "Live at Blue Hall",
        venue: { name: "Blue Hall" },
      },
      {
        id: "evt-2",
        title: "Comedy Hour",
        startsAt: "2024-05-03T20:00:00.000Z",
        categories: ["comedy"],
        coverUrl: null,
        summary: "Stand-up showcase",
        venue: { name: "Main Stage" },
      },
    ]);
    apiMock.search.mockResolvedValue({ results: [] });
  });

  it("renders home feed and triggers search", async () => {
    const user = userEvent.setup();
    const App = (await import("../../src/App")).default;

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    const jazzCard = await screen.findByText(/Jazz Night/i);
    expect(jazzCard).toBeTruthy();
    expect(screen.getByText(/Comedy Hour/i)).toBeTruthy();

    const searchInput = screen.getByPlaceholderText(/Search by artist, venue or vibe/i);
    await user.type(searchInput, "Jazz");

    await waitFor(() => {
      expect(apiMock.search).toHaveBeenCalled()
    })
    const searchCall = apiMock.search.mock.calls.at(-1)
    expect(searchCall?.[0]).toBe("Jazz")
  });
});
