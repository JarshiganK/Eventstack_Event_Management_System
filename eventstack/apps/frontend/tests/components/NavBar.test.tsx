import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import NavBar from "../../src/components/NavBar";

describe("NavBar", () => {
  it("renders navigation links", () => {
    const { getByRole, getAllByRole } = render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );
    expect(getByRole("navigation").getAttribute("aria-label")).toBe("Primary");
    expect(getAllByRole("link").length).toBeGreaterThanOrEqual(3);
  });
});
