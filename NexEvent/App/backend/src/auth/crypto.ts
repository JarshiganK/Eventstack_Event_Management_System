import bcrypt from "bcryptjs";

/**
 * Hash a plaintext password using bcrypt.
 * Returns a salted hash suitable for storage in the database.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
