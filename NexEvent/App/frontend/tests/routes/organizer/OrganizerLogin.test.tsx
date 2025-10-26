import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

vi.mock("../../../src/lib/api.js", () => ({
  api: {
    login: vi.fn().mockResolvedValue({ token: "t", user: { role: "ORGANIZER" } }),
    register: vi.fn().mockResolvedValue({ token: "t", user: { role: "ORGANIZER" } }),
  },
}));

vi.mock("../../../src/lib/auth.js", () => ({
  setToken: vi.fn(),
  fetchRole: vi.fn().mockResolvedValue(null),
}));

describe("routes/organizer/OrganizerLogin", () => {
  it("renders organizer access heading", async () => {
    const Component = (await import("../../../src/routes/organizer/OrganizerLogin.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    expect(getByText("Organizer access").tagName).toBe("H1");
  });
});
