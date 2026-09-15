#!/usr/bin/env node
/**
 * Deploy-time database migrator (node-postgres, `pg`).
 *
 * Runs during `npm run build` — on every Vercel deploy — applying pending files
 * in ../database to DATABASE_URL. Each file is applied in one transaction.
 *
 * No DATABASE_URL (local / preview builds) -> skip; the PGLite fallback applies
 * the same files at startup instead (see src/lib/db.ts).
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.log(
    "[migrate] DATABASE_URL not set — skipping (the PGLite fallback migrates itself).",
  );
  process.exit(0);
}

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "..", "database", "schema.sql");

async function main() {
  let text;
  try {
    text = await readFile(schemaPath, "utf8");
  } catch {
    console.log("[migrate] no database/schema.sql file — nothing to do.");
    return;
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    console.log(`[migrate] applying database/schema.sql`);
    await client.query("BEGIN");
    // pg's simple-query protocol runs a whole multi-statement file at once.
    await client.query(text);
    await client.query("COMMIT");
    console.log(`[migrate] done.`);
  } catch (err) {
    console.error(`[migrate] error applying schema.sql`);
    try {
      await client.query("ROLLBACK");
    } catch {
      // ROLLBACK fails when the connection died — keep the original error.
    }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  // pg errors carry the context needed to debug a bad SQL file.
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  process.exit(1);
});
