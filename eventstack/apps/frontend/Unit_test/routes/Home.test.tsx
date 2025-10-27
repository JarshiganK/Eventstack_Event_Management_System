import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiMock = {
  listEvents: vi.fn().mockResolvedValue([]),
  search: vi.fn().mockResolvedValue({ results: [] }),
};

vi.mock("../../src/lib/api.js", () => ({
  api: apiMock,
}));

describe("routes/Home", () => {
  beforeEach(() => {
    apiMock.listEvents.mockReset();
    apiMock.search.mockReset();
    localStorage.clear();
    apiMock.listEvents.mockResolvedValue([]);
    apiMock.search.mockResolvedValue({ results: [] });
  });

  it("renders hero copy", async () => {
    const Component = (await import("../../src/routes/Home.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(getByText(/Discover and book experiences/).tagName).toBe("H1");
    });
  });

  it("filters categories and performs search", async () => {
    localStorage.setItem("home:categoryFiltersVisible", "true");
    const events = [
      {
        id: "evt-1",
        title: "Jazz Night",
        startsAt: new Date().toISOString(),
        categories: ["music"],
        venue: { name: "Blue Hall" },
      },
    ];
    apiMock.listEvents.mockResolvedValue(events);
    apiMock.search.mockResolvedValue({
      results: [
        {
          id: "res-1",
          title: "Jazz Search",
          startsAt: new Date().toISOString(),
        },
      ],
    });

    const user = userEvent.setup();
    const Component = (await import("../../src/routes/Home.js")).default;
    const { getByPlaceholderText, getByRole, findByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiMock.listEvents).toHaveBeenCalled());

    const musicChip = getByRole("button", { name: "Music" });
    await user.click(musicChip);

    const input = getByPlaceholderText("Search by artist, venue or vibe");
    await user.type(input, "Jazz");
    await waitFor(() => expect(apiMock.search).toHaveBeenCalledWith(
      "Jazz",
      expect.objectContaining({})
    ));

    expect(await findByText("Jazz Search")).toBeDefined();

  });

  it("shows fallback when event listing fails", async () => {
    apiMock.listEvents.mockRejectedValueOnce(new Error("network"));
    const Component = (await import("../../src/routes/Home.js")).default;
    const { findByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );

    expect(await findByText(/No events in this vibe yet/)).toBeDefined();
  });

  it("handles search errors gracefully", async () => {
    apiMock.search.mockRejectedValueOnce(new Error("boom"));
    const Component = (await import("../../src/routes/Home.js")).default;
    const { getByPlaceholderText, getByRole, findByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );

    const input = getByPlaceholderText("Search by artist, venue or vibe");
    await userEvent.type(input, "Comedy");
    await waitFor(() => expect(apiMock.search).toHaveBeenCalled());

    expect(await findByText("We couldn't search right now. Please try again.")).toBeDefined();

    await userEvent.clear(input);
    await userEvent.click(getByRole("button", { name: "Search" }));
    expect(apiMock.search).toHaveBeenCalledTimes(1);
  });

  it("responds to visibility events for category filters", async () => {
    localStorage.setItem("home:categoryFiltersVisible", "true");
    apiMock.listEvents.mockResolvedValue([
      {
        id: "evt-1",
        title: "Comedy Night",
        startsAt: new Date().toISOString(),
        categories: ["comedy"],
      },
    ]);

    const Component = (await import("../../src/routes/Home.js")).default;
    const { getByRole, findByRole, queryByRole } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );

    const comedyChip = await findByRole("button", { name: "Comedy" });
    await userEvent.click(comedyChip);
    expect(comedyChip.getAttribute("aria-pressed")).toBe("true");

    window.dispatchEvent(
      new CustomEvent("homeCategoryFiltersVisibilityChanged", { detail: { value: false } })
    );

    await waitFor(() => expect(queryByRole("button", { name: "Comedy" })).toBeNull());
  });

  it("reacts to storage events toggling filters", async () => {
    const Component = (await import("../../src/routes/Home.js")).default;
    const { getByRole } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );

    const allChip = getByRole("button", { name: "All vibes" });
    expect(allChip.getAttribute("aria-pressed")).toBe("true");

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "home:categoryFiltersVisible",
        newValue: "false",
      })
    );

    expect(allChip.getAttribute("aria-pressed")).toBe("true");
  });
});
