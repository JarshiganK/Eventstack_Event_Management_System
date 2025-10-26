import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

vi.mock("../../src/lib/api.js", () => ({
  api: {
    login: vi.fn().mockResolvedValue({ token: "t", user: { role: "USER" } }),
    register: vi.fn().mockResolvedValue({ token: "t", user: { role: "USER" } }),
  },
}));

vi.mock("../../src/lib/auth.js", () => ({
  setToken: vi.fn(),
}));

describe("routes/Login", () => {
  it("shows sign in heading", async () => {
    const Component = (await import("../../src/routes/Login.js")).default;
    const { getByRole } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    expect(
      getByRole("heading", { level: 1, name: /sign in/i })
    ).toBeDefined();
  });
});
