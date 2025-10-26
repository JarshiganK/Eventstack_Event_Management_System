import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";

vi.mock("../../src/lib/api.js", () => ({
  api: {
    me: vi.fn().mockResolvedValue({ user: { id: "u1", email: "user@test.dev", role: "USER" } }),
  },
}));

vi.mock("../../src/lib/auth.js", () => ({
  clearToken: vi.fn(),
}));

describe("routes/Profile", () => {
  it("shows profile heading", async () => {
    const Component = (await import("../../src/routes/Profile.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(getByText("Profile").tagName).toBe("H1");
    });
  });
});
