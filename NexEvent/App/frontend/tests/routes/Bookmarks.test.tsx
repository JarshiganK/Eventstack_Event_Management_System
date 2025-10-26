import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";

vi.mock("../../src/lib/api.js", () => ({
  api: { listBookmarks: vi.fn().mockResolvedValue([]) },
}));

describe("routes/Bookmarks", () => {
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
});
