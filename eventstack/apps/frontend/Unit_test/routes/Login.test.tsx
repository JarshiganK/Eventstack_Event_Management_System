import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const { MemoryRouter } = await import("react-router-dom");

const apiMock = {
  login: vi.fn().mockResolvedValue({ token: "t", user: { role: "USER" } }),
  register: vi.fn().mockResolvedValue({ token: "t", user: { role: "USER" } }),
};

vi.mock("../../src/lib/api.js", () => ({
  api: apiMock,
}));

const setTokenMock = vi.fn();

vi.mock("../../src/lib/auth.js", () => ({
  setToken: setTokenMock,
}));

describe("routes/Login", () => {
  beforeEach(() => {
    setTokenMock.mockReset();
    apiMock.login.mockReset();
    apiMock.register.mockReset();
    apiMock.login.mockResolvedValue({ token: "t", user: { role: "USER" } });
    apiMock.register.mockResolvedValue({ token: "t", user: { role: "USER" } });
    navigateMock.mockReset();
  });

  it("shows sign in heading", async () => {
    const Component = (await import("../../src/routes/Login.js")).default;
    const { getByRole } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );
    expect(
      getByRole("heading", { level: 1, name: /sign in/i }),
    ).toBeDefined();
  });

  it("submits login form and navigates using role", async () => {
    apiMock.login.mockResolvedValueOnce({ token: "tok", user: { role: "ADMIN" } });
    const Component = (await import("../../src/routes/Login.js")).default;
    const { getByLabelText, getByRole } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );

    await userEvent.type(getByLabelText("Email"), "admin@test.dev");
    await userEvent.type(getByLabelText("Password"), "password123");
    await userEvent.click(getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(apiMock.login).toHaveBeenCalled());
    expect(setTokenMock).toHaveBeenCalledWith("tok");
    expect(navigateMock).toHaveBeenCalledWith("/admin/dashboard");
  });

  it("registers organizer accounts and redirects accordingly", async () => {
    apiMock.register.mockResolvedValueOnce({ token: "t", user: { role: "ORGANIZER" } });
    const Component = (await import("../../src/routes/Login.js")).default;
    const { getByLabelText, getByRole, getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );

    await userEvent.click(getByText(/Need an account/i));
    await userEvent.click(getByText("Organizer"));
    await userEvent.type(getByLabelText("Email"), "org@test.dev");
    await userEvent.type(getByLabelText("Password"), "secret123");
    await userEvent.click(getByRole("button", { name: /Create account/i }));

    await waitFor(() => expect(apiMock.register).toHaveBeenCalledWith(
      "org@test.dev",
      "secret123",
      "ORGANIZER",
    ));
    expect(navigateMock).toHaveBeenCalledWith("/organizer/dashboard");
  });

  it("shows error messages from server responses", async () => {
    apiMock.login.mockRejectedValueOnce(new Error(JSON.stringify({ error: "Invalid credentials" })));
    const Component = (await import("../../src/routes/Login.js")).default;
    const { getByLabelText, getByRole, findByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );

    await userEvent.type(getByLabelText("Email"), "user@test.dev");
    await userEvent.type(getByLabelText("Password"), "bad");
    await userEvent.click(getByRole("button", { name: /sign in/i }));

    expect(await findByText("Invalid credentials")).toBeDefined();
  });

  it("falls back to generic messages when parsing fails", async () => {
    apiMock.register.mockRejectedValueOnce(new Error("   "));
    const Component = (await import("../../src/routes/Login.js")).default;
    const { getByLabelText, getByRole, getByText, findByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );

    await userEvent.click(getByText(/Need an account/i));
    await userEvent.type(getByLabelText("Email"), "user@test.dev");
    await userEvent.type(getByLabelText("Password"), "secret123");
    await userEvent.click(getByRole("button", { name: /Create account/i }));

    expect(
      await findByText("We could not create your account right now. Please try again."),
    ).toBeDefined();
  });
});
