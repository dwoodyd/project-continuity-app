/**
 * One-time script: promote the app owner to admin role.
 * Uses the OWNER_OPEN_ID env var to identify the correct user.
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
const OWNER_OPEN_ID = process.env.OWNER_OPEN_ID;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

if (!OWNER_OPEN_ID) {
  console.error("OWNER_OPEN_ID not set");
  process.exit(1);
}

const conn = await createConnection(DATABASE_URL);

// Find the user by openId
const [rows] = await conn.execute(
  "SELECT id, name, email, role FROM users WHERE openId = ?",
  [OWNER_OPEN_ID]
);

if (!rows.length) {
  console.log("No user found with OWNER_OPEN_ID:", OWNER_OPEN_ID);
  console.log("The owner may not have logged in yet. Log in first, then run this script.");
  await conn.end();
  process.exit(1);
}

const user = rows[0];
console.log(`Found user: id=${user.id}, name=${user.name}, role=${user.role}`);

if (user.role === "admin") {
  console.log("User is already an admin. Nothing to do.");
  await conn.end();
  process.exit(0);
}

// Promote to admin
await conn.execute("UPDATE users SET role = 'admin' WHERE id = ?", [user.id]);
console.log(`✓ User ${user.name} (id=${user.id}) promoted to admin.`);

await conn.end();
