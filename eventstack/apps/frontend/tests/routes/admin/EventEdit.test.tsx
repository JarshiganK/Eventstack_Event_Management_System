import { describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";

const apiMock = {
  getEvent: vi.fn().mockResolvedValue({
    id: "evt",
    title: "Sample",
    summary: "",
    startsAt: new Date().toISOString(),
    endsAt: new Date().toISOString(),
    categories: [],
  }),
  updateEvent: vi.fn().mockResolvedValue({}),
  uploadFile: vi.fn().mockResolvedValue({ url: "/img.png" }),
  addEventImage: vi.fn().mockResolvedValue({}),
};

vi.mock("../../../src/lib/api.js", () => ({
  api: apiMock,
}));

describe("routes/admin/EventEdit", () => {
  it("renders edit form after loading event", async () => {
    const Component = (await import("../../../src/routes/admin/EventEdit.js")).default;
    const { getByText } = render(
      <MemoryRouter initialEntries={["/admin/events/evt/edit"]}>
        <Routes>
          <Route path="/admin/events/:id/edit" element={<Component />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getByText("Edit event").tagName).toBe("H1");
    });
  });
});
