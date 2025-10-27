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

describe("routes/Search", () => {
  beforeEach(() => {
    apiMock.listEvents.mockReset();
    apiMock.search.mockReset();
    apiMock.listEvents.mockResolvedValue([]);
    apiMock.search.mockResolvedValue({ results: [] });
  });

  it("renders search heading", async () => {
    const Component = (await import("../../src/routes/Search.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(getByText("Search events").tagName).toBe("H1");
    });
  });

  it("performs search with category filter", async () => {
    apiMock.listEvents.mockResolvedValue([
      { id: "evt-1", title: "Concert", startsAt: new Date().toISOString(), categories: ["music"] },
    ]);
    apiMock.search.mockResolvedValue({
      results: [
        { id: "evt-2", title: "Concert", startsAt: new Date().toISOString() },
      ],
    });

    const user = userEvent.setup();
    const Component = (await import("../../src/routes/Search.js")).default;
    const { getByPlaceholderText, getByRole, findByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiMock.listEvents).toHaveBeenCalled());

    const categoryChip = getByRole("button", { name: "Music" });
    await user.click(categoryChip);

    const input = getByPlaceholderText(/Try "Comedy"/);
    await user.type(input, "Concert");
    await waitFor(() =>
      expect(apiMock.search).toHaveBeenCalledWith(
        "Concert",
        expect.objectContaining({ category: "music" }),
      ),
    );

    expect(await findByText("Concert")).toBeDefined();
  });
});
