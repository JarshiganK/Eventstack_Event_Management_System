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

const meMock = vi.fn().mockResolvedValue({
  user: { id: "u1", email: "user@test.dev", role: "USER" },
});

vi.mock("../../../src/lib/api.js", () => ({
  api: {
    me: meMock,
  },
}));

const clearTokenMock = vi.fn();

vi.mock("../../../src/lib/auth.js", () => ({
  clearToken: clearTokenMock,
}));

describe("routes/Profile", () => {
  beforeEach(() => {
    meMock.mockReset();
    meMock.mockResolvedValue({
      user: { id: "u1", email: "user@test.dev", role: "USER" },
    });
    clearTokenMock.mockReset();
    navigateMock.mockReset();
  });

  it("shows profile heading", async () => {
    const Component = (await import("../../../src/routes/Profile.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(getByText("Profile").tagName).toBe("H1");
    });
  });

  it("shows guest view when unauthorized", async () => {
    meMock.mockRejectedValueOnce(new Error(JSON.stringify({ error: "Unauthorized" })));
    const Component = (await import("../../../src/routes/Profile.js")).default;
    const { findByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );
    expect(await findByText(/You are not signed in/)).toBeDefined();
  });

  it("renders error message when profile fails", async () => {
    meMock.mockRejectedValueOnce(new Error("Server exploded"));
    const Component = (await import("../../../src/routes/Profile.js")).default;
    const { findByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );
    expect(await findByText(/We couldn’t load your profile/)).toBeDefined();
  });

  it("renders profile details and formatted role", async () => {
    meMock.mockResolvedValueOnce({
      user: { id: "u2", email: "admin@test.dev", role: "ADMIN" },
    });
    const Component = (await import("../../../src/routes/Profile.js")).default;
    const { findByText, getByRole } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );

    expect(await findByText("admin@test.dev")).toBeDefined();
    expect(getByRole("button", { name: /Sign out/ })).toBeDefined();
    expect(getByRole("link", { name: "Organizer dashboard" }).getAttribute("href")).toBe("/organizer/dashboard");
    expect(getByRole("link", { name: "Admin console" }).getAttribute("href")).toBe("/admin/dashboard");
  });

  it("signs out and navigates to login", async () => {
    const Component = (await import("../../../src/routes/Profile.js")).default;
    const { findByRole } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );

    const button = await findByRole("button", { name: /Sign out/ });
    await userEvent.click(button);

    expect(clearTokenMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true });
  });
});
