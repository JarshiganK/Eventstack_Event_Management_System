// Load environment variables from .env file
import dotenv from "dotenv";
// Library for validating and parsing environment variables
import { z } from "zod";

dotenv.config();

// Define what environment variables we expect and their types
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.preprocess((v) => Number(v), z.number().int().positive()).default(4000),
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgres")),
  JWT_SECRET: z.string().min(6),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  GEMINI_API_KEY: z.string().optional()
});

// Parse and validate all environment variables
export const env = EnvSchema.parse(process.env);

// Convert CORS origins string into a list of allowed domains
export const corsOriginList = env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);


