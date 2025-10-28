import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiMock = {
  login: vi.fn().mockResolvedValue({ token: "t", user: { role: "ADMIN" } }),
};
const setTokenMock = vi.fn();

vi.mock("../../../../src/lib/api.js", () => ({
  api: apiMock,
}));

vi.mock("../../../../src/lib/auth.js", () => ({
  setToken: setTokenMock,
}));

describe("routes/admin/AdminLogin", () => {
  beforeEach(() => {
    apiMock.login.mockClear();
    setTokenMock.mockClear();
  });

  it("renders admin login form", async () => {
    const Component = (await import("../../../../src/routes/admin/AdminLogin.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    expect(getByText("Sign in to the admin console").tagName).toBe("H2");
  });

  it("submits credentials and navigates", async () => {
    const Component = (await import("../../../../src/routes/admin/AdminLogin.js")).default;
    const { getByLabelText, getByRole } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );

    await userEvent.type(getByLabelText("Email"), "admin@test.dev");
    await userEvent.type(getByLabelText("Password"), "password123");
    await userEvent.click(getByRole("button", { name: /Sign in/ }));

    await waitFor(() => expect(apiMock.login).toHaveBeenCalled());
    expect(setTokenMock).toHaveBeenCalledWith("t");
  });

  it("shows error when login fails", async () => {
    apiMock.login.mockRejectedValueOnce(new Error("Invalid"));
    const Component = (await import("../../../../src/routes/admin/AdminLogin.js")).default;
    const { getByLabelText, getByRole, findByRole } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );

    await userEvent.type(getByLabelText("Email"), "admin@test.dev");
    await userEvent.type(getByLabelText("Password"), "badpass");
    await userEvent.click(getByRole("button", { name: /Sign in/ }));

    expect(await findByRole("alert")).toBeDefined();
  });
});
