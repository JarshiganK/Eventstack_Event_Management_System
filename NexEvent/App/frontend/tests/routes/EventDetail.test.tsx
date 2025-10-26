import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";

vi.mock("../../src/lib/api.js", () => ({
  api: {
    getEvent: vi.fn().mockResolvedValue({
      id: "evt",
      title: "Concert Night",
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      categories: ["music"],
    }),
    addBookmark: vi.fn(),
    removeBookmark: vi.fn(),
  },
}));

describe("routes/EventDetail", () => {
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
});
