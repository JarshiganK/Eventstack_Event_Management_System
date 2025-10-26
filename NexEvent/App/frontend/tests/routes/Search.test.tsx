import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";

const apiMock = {
  listEvents: vi.fn().mockResolvedValue([]),
  search: vi.fn().mockResolvedValue({ results: [] }),
};

vi.mock("../../src/lib/api.js", () => ({
  api: apiMock,
}));

describe("routes/Search", () => {
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
});
