import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import App from "../src/App";

describe("App", () => {
  it("renders application routes", () => {
    const { getAllByRole } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    const mains = getAllByRole("main");
    expect(mains.length).toBeGreaterThan(0);
  });
});
