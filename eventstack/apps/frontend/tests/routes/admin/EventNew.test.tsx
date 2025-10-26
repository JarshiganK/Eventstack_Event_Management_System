import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

vi.mock("../../../src/lib/api.js", () => ({
  api: {
    createEvent: vi.fn().mockResolvedValue({ id: "evt" }),
    uploadFile: vi.fn().mockResolvedValue({ url: "/img.png" }),
    addEventImage: vi.fn().mockResolvedValue({}),
  },
}));

describe("routes/admin/EventNew", () => {
  it("renders create event page", async () => {
    const Component = (await import("../../../src/routes/admin/EventNew.js")).default;
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    );
    expect(getByText("Create a new event").tagName).toBe("H1");
  });
});
