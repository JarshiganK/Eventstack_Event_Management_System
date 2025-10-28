import { EventEmitter } from "events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockFastify } from "../helpers/mockFastify.js";

const mocks = vi.hoisted(() => ({
  requireOrganizerOrAdmin: vi.fn(),
  createWriteStream: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock("../../../src/auth.js", () => ({
  requireOrganizerOrAdmin: mocks.requireOrganizerOrAdmin,
}));

vi.mock("fs", () => ({
  createWriteStream: mocks.createWriteStream,
  existsSync: mocks.existsSync,
  mkdirSync: mocks.mkdirSync,
}));

type HandlerCollection = ReturnType<typeof createMockFastify>["handlers"];

function findHandler(
  handlers: HandlerCollection,
  method: keyof HandlerCollection,
  path: string,
) {
  const mockFn = handlers[method] as any;
  const call = mockFn.mock.calls.find((entry: any[]) => entry[0] === path);
  if (!call) return undefined;
  if (call.length === 2) return call[1];
  return call[2];
}

describe("routes/uploads", () => {
  beforeEach(() => {
    mocks.requireOrganizerOrAdmin.mockReset();
    mocks.createWriteStream.mockReset();
    mocks.existsSync.mockReset();
    mocks.mkdirSync.mockReset();
  });

  it("registers upload endpoint", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/uploads.js")).default;

    await registerRoutes(app);

    const call = handlers.post.mock.calls.find((args: any[]) => args[0] === "/admin/uploads");
    expect(call?.[1]).toEqual({ preHandler: mocks.requireOrganizerOrAdmin });
    expect(typeof call?.[2]).toBe("function");
  });

  it("saves uploaded files and returns URL", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/uploads.js")).default;
    await registerRoutes(app);

    mocks.existsSync.mockReturnValue(true);

    const stream = new EventEmitter();
    stream.on = stream.on.bind(stream);
    mocks.createWriteStream.mockReturnValue(stream as any);

    const handler = findHandler(
      handlers,
      "post",
      "/admin/uploads",
    ) as (req: any) => Promise<any>;

    const result = await handler({
      file: async () => ({
        filename: "My Image!.png",
        file: {
          pipe(dest: EventEmitter) {
            setTimeout(() => dest.emit("finish"), 0);
          },
        },
      }),
    });

    expect(mocks.createWriteStream).toHaveBeenCalled();
    expect(result.url).toMatch(/\/uploads\/\d+_My_Image_\.png/);
  });

  it("returns null URL when no file is provided", async () => {
    const { app, handlers } = createMockFastify();
    const registerRoutes = (await import("../../../src/routes/uploads.js")).default;
    await registerRoutes(app);

    const handler = findHandler(
      handlers,
      "post",
      "/admin/uploads",
    ) as (req: any) => Promise<any>;

    const result = await handler({
      file: async () => null,
    });

    expect(result).toEqual({ url: null });
    expect(mocks.createWriteStream).not.toHaveBeenCalled();
  });
});
