import { Pool, QueryConfig, QueryResult } from "pg";
import { env } from "./env.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
});

export async function query<T = any>(text: string | QueryConfig<any[]>, params?: any[]): Promise<QueryResult<T>> {
  return pool.query<T>(text as any, params);
}


