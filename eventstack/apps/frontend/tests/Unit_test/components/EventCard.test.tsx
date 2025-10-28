import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const EventCard = (await import("../../../src/components/EventCard")).default;
const { MemoryRouter } = await import("react-router-dom");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("components/EventCard", () => {
  it("renders disabled layout when id missing", () => {
    const { getByRole, getByText } = render(
      <MemoryRouter>
        <EventCard
          event={{
            title: "Mystery Event",
            summary: "Details coming soon",
            startsAt: "invalid-date",
          }}
        />
      </MemoryRouter>,
    );

    const article = getByRole("article", { hidden: true });
    expect(article.getAttribute("aria-disabled")).toBe("true");
    expect(getByText("Mystery Event")).toBeDefined();
    expect(getByText("Date to be announced")).toBeDefined();
  });

  it("resolves artwork and metadata when id provided", () => {
    vi.stubGlobal("location", { origin: "http://localhost" });
    const { getByRole, getByText, getByAltText } = render(
      <MemoryRouter>
        <EventCard
          event={{
            id: "evt-1",
            title: "Concert",
            summary: "Live music",
            categories: ["live_music"],
            startsAt: "2024-01-01T19:00:00.000Z",
            endsAt: "2024-01-01T21:00:00.000Z",
            coverUrl: "/uploads/cover.jpg",
            venue: { name: "Main Hall" },
          }}
        />
      </MemoryRouter>,
    );

    const link = getByRole("link", { name: "Concert" });
    expect(link.getAttribute("href")).toBe("/event/evt-1");
    expect(getByAltText("Concert").getAttribute("src")).toBe("http://localhost:4000/uploads/cover.jpg");
    expect(getByText("Live Music")).toBeDefined();
    expect(getByText(/Main Hall/)).toBeDefined();
  });
});
