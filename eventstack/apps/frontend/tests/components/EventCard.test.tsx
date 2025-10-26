import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";
import EventCard from "../../src/components/EventCard";

describe("EventCard", () => {
  it("renders event title", () => {
    const event = {
      id: "evt-1",
      title: "Sample Event",
      startsAt: new Date().toISOString(),
    };

    const { getByText } = render(
      <MemoryRouter>
        <EventCard event={event} />
      </MemoryRouter>
    );

    expect(getByText("Sample Event").tagName).toBe("H3");
  });
});
