import { FastifyReply, FastifyRequest } from "fastify";
import { verifyJwt } from "./jwt.js";
import { query } from "../db.js";

export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers["authorization"] || "";
  const token = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : "";
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
  const user = (req as any).user as { role?: string };
  const role = (user.role || '').toUpperCase();
  if (role !== "ADMIN") {
    reply.code(403).send({ error: "Forbidden" });
  }
}

export async function requireOrganizerOrAdmin(req: FastifyRequest, reply: FastifyReply) {
  await requireUser(req, reply);
  if (reply.sent) return;
  const user = (req as any).user as { role?: string };
  const role = (user.role || '').toUpperCase();
  if (role !== "ADMIN" && role !== "ORGANIZER") {
    reply.code(403).send({ error: "Forbidden" });
  }
}
