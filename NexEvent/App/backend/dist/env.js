import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();
const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.preprocess((v) => Number(v), z.number().int().positive()).default(4000),
    DATABASE_URL: z.string().url().or(z.string().startsWith("postgres")),
    JWT_SECRET: z.string().min(6),
    CORS_ORIGINS: z.string().default("http://localhost:5173")
});
export const env = EnvSchema.parse(process.env);
export const corsOriginList = env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
