import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

const navigateMock = vi.fn();
const locationMock = { pathname: "/current" };

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useLocation: () => locationMock,
  };
});

const BackLink = (await import("../../../src/components/BackLink")).default;

describe("components/BackLink", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.useFakeTimers();
    vi.stubGlobal("location", { pathname: "/current" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders label and variant styles", () => {
    const { getByRole } = render(<BackLink variant="light" className="extra">Go back</BackLink>);
    const button = getByRole("button", { name: /go back/i });
    expect(button.className).toContain("back-link");
    expect(button.className).toContain("back-link--light");
    expect(button.className).toContain("extra");
  });

  it("navigates back and falls back when history unchanged", async () => {
    const { getByRole } = render(<BackLink fallback="/home" />);
    const button = getByRole("button", { name: /back/i });

    act(() => {
      button.click();
    });

    expect(navigateMock).toHaveBeenCalledWith(-1);
    expect(navigateMock).not.toHaveBeenCalledWith("/home");

    await vi.runAllTimersAsync();

    expect(navigateMock).toHaveBeenLastCalledWith("/home", { replace: true });
  });
});
