// Fast web server framework
import Fastify from "fastify";
// Allow requests from other websites (CORS)
import cors from "@fastify/cors";
// Handle file uploads
import multipart from "@fastify/multipart";
// Get list of allowed websites from environment
import { corsOriginList } from "./env.js";

// Import all our API route handlers
import authRoutes from "./routes/auth.js";
import eventRoutes from "./routes/events.js";
import bookmarkRoutes from "./routes/bookmarks.js";
import uploadRoutes from "./routes/uploads.js";
import searchRoutes from "./routes/search.js";
import adminRoutes from "./routes/admin.js";
import expensesRoutes from "./routes/expenses.js";
import budgetBotRoutes from "./routes/budgetBot.js";
// File system utilities
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
// Serve static files (like uploaded images)
import fastifyStatic from "@fastify/static";

// Function that sets up and configures our server
export async function buildServer() {
  // Create a new Fastify server with logging enabled
  const app = Fastify({ logger: true });
  
  // Allow requests from our frontend and other allowed domains
  await app.register(cors, { origin: (origin, cb) => cb(null, !origin || corsOriginList.includes(origin)) });
  
  // Enable file uploads
  await app.register(multipart);

  // Set up folder for uploaded files
  const uploadsDir = join(process.cwd(), "apps", "backend", "uploads");
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  
  // Serve uploaded files at /uploads/ URL
  await app.register(fastifyStatic as any, { root: uploadsDir, prefix: "/uploads/" });

  // Simple health check endpoint
  app.get("/api/health", async () => ({ ok: true }));

  // Register all our API routes with /api prefix
  await app.register(authRoutes, { prefix: "/api" });
  await app.register(eventRoutes, { prefix: "/api" });
  await app.register(bookmarkRoutes, { prefix: "/api" });
  await app.register(uploadRoutes, { prefix: "/api" });
  await app.register(searchRoutes, { prefix: "/api" });
  await app.register(expensesRoutes, { prefix: "/api" });
  await app.register(budgetBotRoutes, { prefix: "/api" });
  await app.register(adminRoutes, { prefix: "/api" });

  return app;
}


