import { describe, expect, it, vi } from "vitest";

const httpMock = vi.fn();

vi.mock("../../../src/lib/http.js", () => ({
  http: httpMock,
}));

describe("lib/api/admin", () => {
  it("requests analytics data", async () => {
    httpMock.mockResolvedValue({});
    const { getAnalytics } = await import("../../../src/lib/api/admin.js");
    await getAnalytics();
    expect(httpMock).toHaveBeenCalledWith("/admin/analytics");
  });

  it("filters users by role when provided", async () => {
    httpMock.mockResolvedValue([]);
    const { listUsers } = await import("../../../src/lib/api/admin.js");
    await listUsers({ role: "ORGANIZER" });
    expect(httpMock).toHaveBeenCalledWith("/admin/users?role=ORGANIZER");
  });

  it("sends role updates", async () => {
    httpMock.mockResolvedValue({});
    const { updateUserRole } = await import("../../../src/lib/api/admin.js");
    await updateUserRole("1", "USER");
    expect(httpMock).toHaveBeenCalledWith(
      "/admin/users/1/role",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
