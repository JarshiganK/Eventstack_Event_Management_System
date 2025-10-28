import { describe, expect, it } from "vitest";
import { api } from "../../../src/lib/api";

describe("lib/api aggregator", () => {
  it("exposes shared api helpers", () => {
    expect(typeof api.login).toBe("function");
    expect(typeof api.listEvents).toBe("function");
    expect(typeof api.getAnalytics).toBe("function");
  });
});
