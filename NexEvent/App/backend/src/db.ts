import { Pool } from "pg";

// Minimal local result shape used by our code. We avoid importing pg's
// QueryResult type directly to keep module resolution simple and portable.
export type DBResult<T> = {
  rows: T[];
  rowCount: number;
};
import { env } from "./env.js";

// Postgres connection pool shared across the backend. Using a single pool
// allows efficient reuse of connections and is safe for concurrent request handling.
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined
});

/**
 * Simple wrapper around pg.Pool.query with a generic return type.
 * Use this throughout routes to run SQL queries.
 */
export async function query<T = any>(text: string | any, params?: any[]): Promise<DBResult<T>> {
  return pool.query(text as any, params) as unknown as Promise<DBResult<T>>;
}


