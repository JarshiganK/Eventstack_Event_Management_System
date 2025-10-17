import { readFileSync } from "fs";
import { resolve } from "path";
import { pool } from "../src/db";

async function migrate() {
  const schemaPath = resolve(process.cwd(), "apps", "backend", "database", "schema.sql");
  const sql = readFileSync(schemaPath, "utf8");
  await pool.query(sql);
}

migrate()
  .then(() => {
    console.log("Migration completed");
    return pool.end();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });


