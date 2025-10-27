import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

const NavBar = (await import("../../src/components/NavBar")).default;

describe("components/NavBar", () => {
  it("marks the current route as active", () => {
    const { getByLabelText } = render(
      <MemoryRouter initialEntries={["/"]}>
        <NavBar />
      </MemoryRouter>,
    );

    expect(getByLabelText("Home").className).toContain("navbtn--active");
    expect(getByLabelText("Bookmarks").className).not.toContain("navbtn--active");
  });

  it("highlights other routes when navigated", () => {
    const { getByLabelText } = render(
      <MemoryRouter initialEntries={["/bookmarks"]}>
        <NavBar />
      </MemoryRouter>,
    );

    expect(getByLabelText("Bookmarks").className).toContain("navbtn--active");
    expect(getByLabelText("Profile").className).not.toContain("navbtn--active");
  });
});
