import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiMock = {
  getEvent: vi.fn().mockResolvedValue({
    id: "evt",
    title: "Concert Night",
    summary: "Live show",
    startsAt: new Date().toISOString(),
    endsAt: new Date().toISOString(),
    categories: ["music"],
    venue: { name: "Main Hall" },
  }),
  addBookmark: vi.fn().mockResolvedValue({}),
  removeBookmark: vi.fn().mockResolvedValue({}),
};

vi.mock("../../src/lib/api.js", () => ({
  api: apiMock,
}));

const storageMocks = {
  addLocalBookmark: vi.fn(),
  getLocalBookmarks: vi.fn().mockReturnValue([]),
  removeLocalBookmark: vi.fn(),
};

vi.mock("../../src/lib/storage.js", () => storageMocks);

describe("routes/EventDetail", () => {
  beforeEach(() => {
    apiMock.getEvent.mockClear();
    apiMock.addBookmark.mockClear();
    apiMock.removeBookmark.mockClear();
    apiMock.getEvent.mockResolvedValue({
      id: "evt",
      title: "Concert Night",
      summary: "Live show",
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      categories: ["music"],
      venue: { name: "Main Hall" },
    });
    storageMocks.getLocalBookmarks.mockReturnValue([]);
    storageMocks.addLocalBookmark.mockReset();
    storageMocks.removeLocalBookmark.mockReset();
    vi.stubGlobal("navigator", {
      share: vi.fn().mockResolvedValue(undefined),
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    } as any);
    vi.stubGlobal("open", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders event title after load", async () => {
    const Component = (await import("../../src/routes/EventDetail.js")).default;
    const { getByText } = render(
      <MemoryRouter initialEntries={["/event/evt"]}>
        <Routes>
          <Route path="/event/:id" element={<Component />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(getByText("Concert Night").tagName).toBe("H1");
    });
  });

  it("toggles bookmark and triggers share/calendar actions", async () => {
    const Component = (await import("../../src/routes/EventDetail.js")).default;
    const { getByRole, getByText } = render(
      <MemoryRouter initialEntries={["/event/evt"]}>
        <Routes>
          <Route path="/event/:id" element={<Component />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(apiMock.getEvent).toHaveBeenCalled());

    const bookmarkButton = getByRole("button", { name: /Bookmark/ });
    await userEvent.click(bookmarkButton);
    expect(apiMock.addBookmark).toHaveBeenCalledWith("evt");

    await userEvent.click(getByRole("button", { name: /Remove bookmark/ }));
    expect(apiMock.removeBookmark).toHaveBeenCalledWith("evt");

    await userEvent.click(getByRole("button", { name: /Share/ }));
    expect(global.navigator.share).toHaveBeenCalled();

    await userEvent.click(getByRole("button", { name: /Add to calendar/ }));
    expect(global.open).toHaveBeenCalled();

    expect(getByText("Live show")).toBeDefined();
  });

  it("shows error state when event fails to load", async () => {
    apiMock.getEvent.mockRejectedValueOnce(new Error("network"));
    const Component = (await import("../../src/routes/EventDetail.js")).default;
    const { findByText } = render(
      <MemoryRouter initialEntries={["/event/evt"]}>
        <Routes>
          <Route path="/event/:id" element={<Component />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await findByText("Event not found")).toBeDefined();
  });

  it("falls back to local bookmarks when API calls fail", async () => {
    apiMock.addBookmark.mockRejectedValueOnce(new Error("offline"));
    const Component = (await import("../../src/routes/EventDetail.js")).default;
    const { getByRole } = render(
      <MemoryRouter initialEntries={["/event/evt"]}>
        <Routes>
          <Route path="/event/:id" element={<Component />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(apiMock.getEvent).toHaveBeenCalled());

    const button = getByRole("button", { name: /Bookmark/ });
    await userEvent.click(button);

    await waitFor(() => expect(storageMocks.addLocalBookmark).toHaveBeenCalledWith("evt"));
  });
});
