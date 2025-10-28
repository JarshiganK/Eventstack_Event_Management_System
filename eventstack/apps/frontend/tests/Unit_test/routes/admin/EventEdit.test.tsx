import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { fireEvent, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const apiMock = {
  getEvent: vi.fn().mockResolvedValue({
    id: "evt",
    title: "Sample",
    summary: "",
    startsAt: new Date().toISOString(),
    endsAt: new Date().toISOString(),
    categories: [],
  }),
  updateEvent: vi.fn().mockResolvedValue({}),
  uploadFile: vi.fn().mockResolvedValue({ url: "/img.png" }),
  addEventImage: vi.fn().mockResolvedValue({}),
};

vi.mock("../../../../src/lib/api.js", () => ({
  api: apiMock,
}));

describe("routes/admin/EventEdit", () => {
  let createUrlSpy: any;
  let revokeUrlSpy: any;
  beforeEach(() => {
    Object.values(apiMock).forEach((fn) => fn.mockClear && fn.mockClear());
    createUrlSpy = vi.spyOn(global.URL, "createObjectURL" as any).mockReturnValue("blob://preview");
    revokeUrlSpy = vi.spyOn(global.URL, "revokeObjectURL" as any).mockImplementation(() => undefined);
  });

  afterEach(() => {
    createUrlSpy.mockRestore();
    revokeUrlSpy.mockRestore();
  });

  it("renders edit form after loading event", async () => {
    const Component = (await import("../../../../src/routes/admin/EventEdit.js")).default;
    const { getByText } = render(
      <MemoryRouter initialEntries={["/admin/events/evt/edit"]}>
        <Routes>
          <Route path="/admin/events/:id/edit" element={<Component />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getByText("Edit event").tagName).toBe("H1");
    });
  });

  it("updates event details and uploads new image", async () => {
    const Component = (await import("../../../../src/routes/admin/EventEdit.js")).default;
    const { getByLabelText, getByRole, getByPlaceholderText, container } = render(
      <MemoryRouter initialEntries={["/admin/events/evt/edit"]}>
        <Routes>
          <Route path="/admin/events/:id/edit" element={<Component />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(apiMock.getEvent).toHaveBeenCalled());

    await userEvent.clear(getByLabelText("Title"));
    await userEvent.type(getByLabelText("Title"), "Updated title");
    await userEvent.type(getByLabelText("Summary"), "Updated summary");
    fireEvent.change(getByLabelText("Starts at"), {
      target: { value: "2024-01-05T10:00" },
    });
    fireEvent.change(getByLabelText("Ends at"), {
      target: { value: "2024-01-05T12:00" },
    });
    fireEvent.change(getByPlaceholderText("Eg. Grand Hall"), {
      target: { value: "New venue" },
    });

    const fileInput = container.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["img"], "new.png", { type: "image/png" });
    await userEvent.upload(fileInput, file);

    await userEvent.click(getByRole("button", { name: /Save changes/ }));

    await waitFor(() => expect(apiMock.updateEvent).toHaveBeenCalled());
    expect(apiMock.uploadFile).toHaveBeenCalled();
    expect(apiMock.addEventImage).toHaveBeenCalled();
  });
});
