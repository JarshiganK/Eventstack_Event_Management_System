import { describe, expect, it, vi } from "vitest";

describe("main entrypoint", () => {
  it("mounts react application", async () => {
    const renderMock = vi.fn();
    const createRootMock = vi.fn(() => ({ render: renderMock }));
    const container = document.createElement("div");
    container.id = "root";
    document.body.appendChild(container);

    vi.doMock("../../src/App", () => ({ default: () => null }));
    vi.doMock("react-dom/client", () => ({ createRoot: createRootMock }));

    await import("../../src/main.tsx");

    expect(createRootMock).toHaveBeenCalledWith(container);
    expect(renderMock).toHaveBeenCalledTimes(1);
  });
});
