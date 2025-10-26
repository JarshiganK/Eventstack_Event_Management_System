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

describe("routes/Home", () => {
  it("renders hero copy", async () => {
    const Component = (await import("../../src/routes/Home.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(getByText(/Discover and book experiences/).tagName).toBe("H1");
    });
  });
});
