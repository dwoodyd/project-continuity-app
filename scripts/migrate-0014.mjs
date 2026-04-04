import mysql from "mysql2/promise";
import { readFileSync } from "fs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const sql = readFileSync(new URL("../drizzle/0014_shallow_talkback.sql", import.meta.url), "utf8");

// Split on the drizzle statement-breakpoint marker
const statements = sql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

const conn = await mysql.createConnection(url);
for (const stmt of statements) {
  console.log("Running:", stmt);
  try {
    await conn.execute(stmt);
    console.log("  ✓ OK");
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("  ⚠ Column already exists, skipping.");
    } else {
      throw err;
    }
  }
}
await conn.end();
console.log("Migration 0014 complete.");
