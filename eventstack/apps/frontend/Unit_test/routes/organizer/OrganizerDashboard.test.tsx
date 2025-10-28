import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiMock = {
  listEvents: vi.fn().mockResolvedValue([]),
  deleteEvent: vi.fn().mockResolvedValue({}),
};

vi.mock("../../../src/lib/api.js", () => ({
  api: apiMock,
}));

describe("routes/organizer/OrganizerDashboard", () => {
  beforeEach(() => {
    apiMock.listEvents.mockReset();
    apiMock.deleteEvent.mockReset();
    apiMock.listEvents.mockResolvedValue([
      {
        id: "evt-1",
        title: "Festival",
        startsAt: new Date(Date.now() + 3600_000).toISOString(),
        categories: ["music"],
        venue: { name: "Hall" },
      },
    ]);
    localStorage.clear();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders dashboard heading", async () => {
    const Component = (await import("../../../src/routes/organizer/OrganizerDashboard.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(getByText("Dashboard").tagName).toBe("H1");
    });
  });

  it("toggles filters and deletes an event", async () => {
    const Component = (await import("../../../src/routes/organizer/OrganizerDashboard.js")).default;
    const { getByRole, findByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiMock.listEvents).toHaveBeenCalled());
    expect(await findByText("Festival")).toBeDefined();

    const homeToggle = getByRole("button", { name: /filters on home/i });
    await userEvent.click(homeToggle);

    const showFilters = getByRole("button", { name: /Show category filters/ });
    await userEvent.click(showFilters);
    const musicChip = getByRole("button", { name: "Music" });
    await userEvent.click(musicChip);

    const deleteBtn = getByRole("button", { name: "Delete" });
    await userEvent.click(deleteBtn);
    await waitFor(() => expect(apiMock.deleteEvent).toHaveBeenCalledWith("evt-1"));
  });
});
