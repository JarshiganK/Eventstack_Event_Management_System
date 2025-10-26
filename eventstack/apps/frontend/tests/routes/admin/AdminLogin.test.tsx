import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

vi.mock("../../../src/lib/api.js", () => ({
  api: { login: vi.fn().mockResolvedValue({ token: "t", user: { role: "ADMIN" } }) },
}));

vi.mock("../../../src/lib/auth.js", () => ({
  setToken: vi.fn(),
}));

describe("routes/admin/AdminLogin", () => {
  it("renders admin login form", async () => {
    const Component = (await import("../../../src/routes/admin/AdminLogin.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    expect(getByText("Sign in to the admin console").tagName).toBe("H2");
  });
});
