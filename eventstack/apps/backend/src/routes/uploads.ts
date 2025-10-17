import { FastifyInstance } from "fastify";
import { requireAdmin } from "../auth.js";
import { join } from "path";
import { createWriteStream } from "fs";

export default async function uploadRoutes(app: FastifyInstance) {
  app.post("/admin/uploads", { preHandler: requireAdmin }, async (req) => {
    const data = await (req as any).file();
    if (!data) return { url: null };
    const filename = `${Date.now()}_${data.filename}`.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uploadsDir = join(process.cwd(), "apps", "backend", "uploads");
    await new Promise<void>((resolve, reject) => {
      const ws = createWriteStream(join(uploadsDir, filename));
      data.file.pipe(ws);
      ws.on("finish", () => resolve());
      ws.on("error", reject);
    });
    return { url: `/uploads/${filename}` };
  });
}


