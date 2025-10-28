import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiMock = {
  listEvents: vi.fn().mockResolvedValue([]),
  getAnalytics: vi.fn().mockResolvedValue({
    totalEvents: 0,
    totalUsers: 0,
    activeEvents: 0,
    upcomingEvents: 0,
    categoriesDistribution: [],
  }),
  listOrganizers: vi.fn().mockResolvedValue([]),
  updateUserRole: vi.fn().mockResolvedValue({}),
  updateUserStatus: vi.fn().mockResolvedValue({}),
  deleteUser: vi.fn().mockResolvedValue({}),
};

vi.mock("../../../../src/lib/api.js", () => ({
  api: apiMock,
}));

describe("routes/admin/Dashboard", () => {
  beforeEach(() => {
    apiMock.listEvents.mockReset();
    apiMock.getAnalytics.mockReset();
    apiMock.listOrganizers.mockReset();
    apiMock.updateUserRole.mockReset();
    apiMock.updateUserStatus.mockReset();
    apiMock.deleteUser.mockReset();
    localStorage.clear();
    apiMock.listEvents.mockResolvedValue([
      {
        id: "evt-1",
        title: "Show",
        startsAt: new Date().toISOString(),
        categories: ["music"],
      },
    ]);
    apiMock.getAnalytics.mockResolvedValue({
      totalEvents: 5,
      totalUsers: 10,
      activeEvents: 2,
      upcomingEvents: 3,
      categoriesDistribution: [{ category: "music", count: 4 }],
    });
    apiMock.listOrganizers.mockResolvedValue([
      { id: "org-1", email: "org@test.dev", role: "ORGANIZER" },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders dashboard heading", async () => {
    const Component = (await import("../../../../src/routes/admin/Dashboard.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(getByText("Dashboard").tagName).toBe("H1");
    });
  });

  it("toggles home filters and interacts with category chips", async () => {
    const Component = (await import("../../../../src/routes/admin/Dashboard.js")).default;
    const { findByText, findAllByText, getByRole } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiMock.listEvents).toHaveBeenCalled());
    await waitFor(() => expect(apiMock.listOrganizers).toHaveBeenCalled());

    const toggleButton = await findByText(/home filters/i);
    await userEvent.click((toggleButton.closest("button") as HTMLButtonElement) ?? toggleButton);

    const musicNodes = await findAllByText("Music");
    const musicButton = musicNodes
      .map((node) => node.closest("button") as HTMLButtonElement | null)
      .find((btn) => btn !== null) ?? (musicNodes[0] as HTMLElement);
    await userEvent.click(musicButton);

    const organizerLink = getByRole("link", { name: /View organizer dashboard/i });
    expect(organizerLink).toBeDefined();

    expect(apiMock.listOrganizers).toHaveBeenCalled();
  });

  it("handles organizer actions and error states", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    apiMock.getAnalytics.mockRejectedValueOnce(new Error("fail analytics"));
    apiMock.listOrganizers.mockRejectedValueOnce(new Error("fail organizers"));

    const Component = (await import("../../../../src/routes/admin/Dashboard.js")).default;
    const { findByText, rerender, getByDisplayValue, getByRole } = render(
      <MemoryRouter>
        <Component key="initial" />
      </MemoryRouter>
    );

    expect(await findByText(/Unable to load analytics data/)).toBeDefined();
    expect(await findByText(/Unable to load organizers/)).toBeDefined();

    // re-render with organizer data to exercise table actions
    apiMock.getAnalytics.mockResolvedValue({
      totalEvents: 4,
      totalUsers: 2,
      activeEvents: 1,
      upcomingEvents: 1,
      categoriesDistribution: [{ category: "music", count: 3 }],
    });
    apiMock.listOrganizers.mockResolvedValue([
      { id: "org-1", email: "org@test.dev", role: "ORGANIZER", status: "ACTIVE", created_at: "2024-01-01" },
    ]);
    rerender(
      <MemoryRouter>
        <Component key="remount" />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiMock.listOrganizers).toHaveBeenCalledTimes(2));

    apiMock.updateUserRole.mockRejectedValueOnce(new Error("role"));
    const roleSelect = getByDisplayValue("ORGANIZER") as HTMLSelectElement;
    await userEvent.selectOptions(roleSelect, "ADMIN");
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Failed to update role"));

    apiMock.updateUserRole.mockResolvedValueOnce({});
    await userEvent.selectOptions(roleSelect, "ADMIN");
    await waitFor(() => expect(apiMock.updateUserRole).toHaveBeenLastCalledWith("org-1", "ADMIN"));

    apiMock.updateUserStatus.mockRejectedValueOnce(new Error("status"));
    const toggleStatus = getByRole("button", { name: /suspend/i });
    await userEvent.click(toggleStatus);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Failed to update status"));

    apiMock.updateUserStatus.mockResolvedValueOnce({});
    await userEvent.click(toggleStatus);
    await waitFor(() => expect(apiMock.updateUserStatus).toHaveBeenLastCalledWith("org-1", "SUSPENDED"));

    apiMock.deleteUser.mockRejectedValueOnce("Delete failed");
    const deleteButton = getByRole("button", { name: "Delete" });
    await userEvent.click(deleteButton);
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("Delete failed"));

    apiMock.deleteUser.mockResolvedValueOnce({});
    await userEvent.click(deleteButton);
    await waitFor(() => expect(apiMock.deleteUser).toHaveBeenLastCalledWith("org-1"));

    expect(confirmSpy).toHaveBeenCalled();
  });
});
