import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";

vi.mock("../../../src/lib/api.js", () => ({
  api: {
    listEvents: vi.fn().mockResolvedValue([]),
    deleteEvent: vi.fn().mockResolvedValue({}),
  },
}));

describe("routes/organizer/OrganizerDashboard", () => {
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
});
