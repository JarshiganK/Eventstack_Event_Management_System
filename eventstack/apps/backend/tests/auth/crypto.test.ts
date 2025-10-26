import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/auth/crypto.js";

describe("auth/crypto", () => {
  it("hashes and verifies a password", async () => {
    const password = "s3cret";
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong", hash)).resolves.toBe(false);
  });
});
