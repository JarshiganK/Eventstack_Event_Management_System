import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "./env.js";
import { FastifyReply, FastifyRequest } from "fastify";
import { query } from "./db.js";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

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

export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers["authorization"] || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const payload = token ? verifyJwt(token) : null;
  if (!payload) {
    reply.code(401).send({ error: "Unauthorized" });
    return;
  }
  const { rows } = await query<{ id: string; email: string; role: string }>(
    "SELECT id, email, role FROM users WHERE id=$1",
    [payload.sub]
  );
  if (!rows[0]) {
    reply.code(401).send({ error: "Unauthorized" });
    return;
  }
  (req as any).user = rows[0];
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  await requireUser(req, reply);
  if (reply.sent) return;
  const user = (req as any).user as { role: string };
  if (user.role !== "ADMIN") {
    reply.code(403).send({ error: "Forbidden" });
  }
}

export async function requireOrganizerOrAdmin(req: FastifyRequest, reply: FastifyReply) {
  await requireUser(req, reply);
  if (reply.sent) return;
  const user = (req as any).user as { role: string };
  if (user.role !== "ADMIN" && user.role !== "ORGANIZER") {
    reply.code(403).send({ error: "Forbidden" });
  }
}


