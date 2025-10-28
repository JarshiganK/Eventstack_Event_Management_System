import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
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

const apiMock = {
  createEvent: vi.fn().mockResolvedValue({ id: "evt" }),
  uploadFile: vi.fn().mockResolvedValue({ url: "/img.png" }),
  addEventImage: vi.fn().mockResolvedValue({}),
};

vi.mock("../../../../src/lib/api.js", () => ({
  api: apiMock,
}));

describe("routes/admin/EventNew", () => {
  beforeEach(() => {
    Object.values(apiMock).forEach(fn => fn.mockReset());
    apiMock.createEvent.mockResolvedValue({ id: "evt" });
    apiMock.uploadFile.mockResolvedValue({ url: "/img.png" });
    apiMock.addEventImage.mockResolvedValue({});
    navigateMock.mockReset();
  });

  async function renderForm() {
    const Component = (await import("../../../../src/routes/admin/EventNew.js")).default;
    return render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );
  }

  it("renders create event page", async () => {
    const { getByText } = await renderForm();
    expect(getByText("Create a new event").tagName).toBe("H1");
  });

  it("submits form with image upload", async () => {
    const { getByLabelText, getByPlaceholderText, getByRole, container } = await renderForm();

    await userEvent.type(getByLabelText("Title"), "Event title");
    await userEvent.type(getByLabelText("Summary"), "Short summary");

    fireEvent.change(getByLabelText("Starts at"), {
      target: { value: "2024-01-01T10:00" },
    });
    fireEvent.change(getByLabelText("Ends at"), {
      target: { value: "2024-01-01T12:00" },
    });
    await userEvent.type(getByPlaceholderText("Venue name"), "Main hall");
    await userEvent.type(getByPlaceholderText("Eg. music,jazz,nightlife"), "music,jazz");

    const fileInput = container.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["image"], "cover.png", { type: "image/png" });
    await userEvent.upload(fileInput, file);

    await userEvent.click(getByRole("button", { name: /Create event/ }));

    await waitFor(() => expect(apiMock.createEvent).toHaveBeenCalled());
    expect(apiMock.uploadFile).toHaveBeenCalled();
    expect(apiMock.addEventImage).toHaveBeenCalledWith("evt", expect.objectContaining({ url: "/img.png" }));
  });

  it("shows errors when event creation fails", async () => {
    apiMock.createEvent.mockRejectedValueOnce(new Error(JSON.stringify({ error: "Invalid payload" })));
    const { getByLabelText, getByPlaceholderText, getByRole, findByText } = await renderForm();

    await userEvent.type(getByLabelText("Title"), "Bad Event");
    fireEvent.change(getByLabelText("Starts at"), { target: { value: "2024-01-01T10:00" } });
    fireEvent.change(getByLabelText("Ends at"), { target: { value: "2024-01-01T11:00" } });
    await userEvent.type(getByPlaceholderText("Venue name"), "Venue");

    await userEvent.click(getByRole("button", { name: /Create event/ }));

    expect(await findByText("Invalid payload")).toBeDefined();
    expect(apiMock.uploadFile).not.toHaveBeenCalled();
  });

  it("handles upload failures gracefully and keeps confirmation toast", async () => {
    const user = userEvent.setup();
    apiMock.uploadFile.mockRejectedValueOnce(new Error("upload failed"));
    const { getByLabelText, getByPlaceholderText, getByRole, container, findByRole } = await renderForm();

    await user.type(getByLabelText("Title"), "Event title");
    fireEvent.change(getByLabelText("Starts at"), { target: { value: "2024-01-01T10:00" } });
    fireEvent.change(getByLabelText("Ends at"), { target: { value: "2024-01-01T11:00" } });
    await user.type(getByPlaceholderText("Venue name"), "Venue");

    const fileInput = container.querySelector("input[type='file']") as HTMLInputElement;
    const file = new File(["img"], "cover.png", { type: "image/png" });
    await user.upload(fileInput, file);

    await user.click(getByRole("button", { name: /Create event/ }));

    const alert = await findByRole("alert");
    expect(alert.textContent).toContain("upload failed");
    await findByRole("status");

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/organizer/dashboard");
    }, { timeout: 2000 });
  });

  it("navigates away when cancel is clicked", async () => {
    const { getByRole } = await renderForm();
    await userEvent.click(getByRole("button", { name: "Cancel" }));
    expect(navigateMock).toHaveBeenCalledWith("/organizer/dashboard");
  });
});
