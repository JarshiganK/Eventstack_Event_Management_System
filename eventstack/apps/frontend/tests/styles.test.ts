import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("styles", () => {
  it("provides base stylesheet", () => {
    const path = join(process.cwd(), "src", "styles.css");
    const css = readFileSync(path, "utf-8");
    expect(css.length).toBeGreaterThan(0);
  });
});
