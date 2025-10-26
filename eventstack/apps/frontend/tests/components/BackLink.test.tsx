import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import BackLink from "../../src/components/BackLink";

describe("BackLink", () => {
  it("renders a button with label", () => {
    const { getByRole } = render(
      <MemoryRouter>
        <BackLink>Go Back</BackLink>
      </MemoryRouter>
    );
    expect(getByRole("button").textContent).toContain("Go Back");
  });
});
