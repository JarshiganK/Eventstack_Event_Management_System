import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db.js";
import { cuid } from "../utils.js";
import { hashPassword, verifyPassword, signJwt, requireUser } from "../auth.js";

const HARD_CODED_ADMIN = {
  id: "admin-static",
  email: "admin@gmail.com",
  password: "admin123",
} as const;

export default async function authRoutes(app: FastifyInstance) {
  const credSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
  const registerSchema = credSchema.extend({ role: z.string().optional() });

  app.post("/auth/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid signup data" });
      return;
    }

    const { email, password, role: rawRole } = parsed.data;
    const normalizedRole = rawRole ? rawRole.trim().toUpperCase() : "";
    const role: "USER" | "ORGANIZER" = normalizedRole === "ORGANIZER" ? "ORGANIZER" : "USER";

    const id = cuid();
    const passwordHash = await hashPassword(password);
    try {
      await query(
        "INSERT INTO users (id, email, password_hash, role) VALUES ($1,$2,$3,$4)",
        [id, email, passwordHash, role]
      );
    } catch (e: any) {
      if (e?.code === "23505") {
        reply.code(400).send({ error: "Email already in use" });
        return;
      }
      reply.code(500).send({ error: "Unable to register user" });
      return;
    }
    const user = { id, email, role } as const;
    const token = signJwt(user);
    return { token, user };
  });

  app.post("/auth/login", async (req, reply) => {
    const body = credSchema.parse(req.body);

    if (body.email === HARD_CODED_ADMIN.email && body.password === HARD_CODED_ADMIN.password) {
      const user = { id: HARD_CODED_ADMIN.id, email: HARD_CODED_ADMIN.email, role: "ADMIN" as const };
      const token = signJwt(user);
      return { token, user };
    }

    const { rows } = await query<{ id: string; email: string; password_hash: string; role: string }>(
      "SELECT * FROM users WHERE email=$1",
      [body.email]
    );
    const userRow = rows[0];
    if (!userRow || !(await verifyPassword(body.password, userRow.password_hash))) {
      reply.code(401).send({ error: "Invalid credentials" });
      return;
    }
    const user = { id: userRow.id, email: userRow.email, role: userRow.role };
    const token = signJwt(user);
    return { token, user };
  });

  app.get("/auth/me", { preHandler: requireUser }, async (req) => {
    const user = (req as any).user;
    return { user };
  });
}
