import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiMock = {
  login: vi.fn().mockResolvedValue({ token: "t", user: { role: "ORGANIZER" } }),
  register: vi.fn().mockResolvedValue({ token: "t", user: { role: "ORGANIZER" } }),
};
const setTokenMock = vi.fn();

vi.mock("../../../src/lib/api.js", () => ({
  api: apiMock,
}));

vi.mock("../../../src/lib/auth.js", () => ({
  setToken: setTokenMock,
  fetchRole: vi.fn().mockResolvedValue(null),
}));

describe("routes/organizer/OrganizerLogin", () => {
  beforeEach(() => {
    apiMock.login.mockClear();
    apiMock.register.mockClear();
    setTokenMock.mockClear();
  });

  it("renders organizer access heading", async () => {
    const Component = (await import("../../../src/routes/organizer/OrganizerLogin.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    expect(getByText("Organizer access").tagName).toBe("H1");
  });

  it("logs in organizer", async () => {
    const Component = (await import("../../../src/routes/organizer/OrganizerLogin.js")).default;
    const { getByLabelText, getByRole } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );

    await userEvent.type(getByLabelText("Email"), "org@test.dev");
    await userEvent.type(getByLabelText("Password"), "password123");
    await userEvent.click(getByRole("button", { name: /Sign in/ }));

    await waitFor(() => expect(apiMock.login).toHaveBeenCalled());
    expect(setTokenMock).toHaveBeenCalledWith("t");
  });

  it("registers organizer account", async () => {
    const Component = (await import("../../../src/routes/organizer/OrganizerLogin.js")).default;
    const { getByText, getByLabelText, getByRole } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );

    await userEvent.click(getByText(/Need access/));
    await userEvent.type(getByLabelText("Email"), "new@test.dev");
    await userEvent.type(getByLabelText("Password"), "password123");
    await userEvent.click(getByRole("button", { name: /Create account/ }));

    await waitFor(() => expect(apiMock.register).toHaveBeenCalled());
    expect(setTokenMock).toHaveBeenCalledWith("t");
  });
});
