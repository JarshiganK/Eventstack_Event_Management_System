import jwt from "jsonwebtoken";
import { env } from "../env.js";

export function signJwt(user: { id: string; email: string; role: string }): string {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyJwt(token: string): { sub: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as any;
  } catch {
    return null;
  }
}
