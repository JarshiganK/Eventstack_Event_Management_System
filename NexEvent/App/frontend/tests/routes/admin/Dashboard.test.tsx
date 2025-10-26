import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";

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
};

vi.mock("../../../src/lib/api.js", () => ({
  api: apiMock,
}));

describe("routes/admin/Dashboard", () => {
  it("renders dashboard heading", async () => {
    const Component = (await import("../../../src/routes/admin/Dashboard.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(getByText("Dashboard").tagName).toBe("H1");
    });
  });
});
