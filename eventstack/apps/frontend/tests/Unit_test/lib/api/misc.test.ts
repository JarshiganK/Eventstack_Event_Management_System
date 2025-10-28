import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const httpMock = vi.fn();
const authHeaderMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("../../../../src/lib/http.js", () => ({
  http: httpMock,
  authHeader: authHeaderMock,
}));

describe("lib/api/misc", () => {
  beforeEach(() => {
    httpMock.mockReset();
    authHeaderMock.mockReturnValue({ Authorization: "Bearer token" });
    (globalThis as any).fetch = fetchMock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ url: "/uploads/file.png" }),
      text: vi.fn(),
    });
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("lists bookmarks via http helper", async () => {
    httpMock.mockResolvedValue([]);
    const { listBookmarks } = await import("../../../../src/lib/api/misc.js");
    await listBookmarks();
    expect(httpMock).toHaveBeenCalledWith("/me/bookmarks");
  });

  it("skips http call when search query is empty", async () => {
    httpMock.mockClear();
    const { search } = await import("../../../../src/lib/api/misc.js");
    const result = await search("   ");
    expect(result).toEqual({ results: [] });
    expect(httpMock).not.toHaveBeenCalled();
  });

  it("uploads files via fetch", async () => {
    const { uploadFile } = await import("../../../../src/lib/api/misc.js");
    const file = new File(["data"], "test.png", { type: "image/png" });
    await uploadFile(file);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("handles bookmark mutations", async () => {
    httpMock.mockResolvedValue({ ok: true });
    const { addBookmark, removeBookmark } = await import(
      "../../../../src/lib/api/misc.js"
    );

    await addBookmark("evt-1");
    expect(httpMock).toHaveBeenCalledWith(
      "/me/bookmarks",
      expect.objectContaining({ method: "POST" }),
    );

    httpMock.mockResolvedValue({ ok: true });
    await removeBookmark("evt-1");
    expect(httpMock).toHaveBeenCalledWith(
      "/me/bookmarks/evt-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});
