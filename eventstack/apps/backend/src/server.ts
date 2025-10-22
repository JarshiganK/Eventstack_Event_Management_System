import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { corsOriginList } from "./env.js";

import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import bookmarkRoutes from "./routes/bookmarks.js";
import uploadRoutes from "./routes/uploads.js";
import notificationRoutes from "./routes/notifications.js";
import searchRoutes from "./routes/search.js";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import fastifyStatic from "@fastify/static";

export async function buildServer() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: (origin, cb) => cb(null, !origin || corsOriginList.includes(origin)) });
  await app.register(multipart);

  const uploadsDir = join(process.cwd(), "apps", "backend", "uploads");
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  await app.register(fastifyStatic as any, { root: uploadsDir, prefix: "/uploads/" });

  app.get("/api/health", async () => ({ ok: true }));

  await app.register(authRoutes, { prefix: "/api" });
  await app.register(eventRoutes, { prefix: "/api" });
  await app.register(bookmarkRoutes, { prefix: "/api" });
  await app.register(uploadRoutes, { prefix: "/api" });
  await app.register(notificationRoutes, { prefix: "/api" });
  await app.register(searchRoutes, { prefix: "/api" });

  return app;
}


