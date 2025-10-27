import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";

const apiMock = { listBookmarks: vi.fn().mockResolvedValue([]) };

vi.mock("../../src/lib/api.js", () => ({
  api: apiMock,
}));

describe("routes/Bookmarks", () => {
  beforeEach(() => {
    apiMock.listBookmarks.mockReset();
    apiMock.listBookmarks.mockResolvedValue([]);
    localStorage.clear();
  });

  it("renders heading for saved events", async () => {
    const Component = (await import("../../src/routes/Bookmarks.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(getByText("Saved events").tagName).toBe("H1");
    });
  });

  it("falls back to local bookmarks when request fails", async () => {
    localStorage.setItem("local_bookmarks", JSON.stringify([{ id: "evt-9999" }]));
    apiMock.listBookmarks.mockRejectedValueOnce(new Error("network"));

    const Component = (await import("../../src/routes/Bookmarks.js")).default;
    const { findByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );

    expect(await findByText(/Saved event 9999/)).toBeDefined();
  });
});
