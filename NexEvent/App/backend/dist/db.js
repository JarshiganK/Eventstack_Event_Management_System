import { Pool } from "pg";
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
export async function query(text, params) {
    return pool.query(text, params);
}
