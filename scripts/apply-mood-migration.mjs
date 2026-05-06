import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";
import { config } from "dotenv";

config();

const sql = `CREATE TABLE IF NOT EXISTS \`mood_logs\` (
  \`id\` int AUTO_INCREMENT NOT NULL,
  \`userId\` int NOT NULL,
  \`date\` varchar(10) NOT NULL,
  \`score\` int NOT NULL,
  \`note\` text,
  \`createdAt\` timestamp NOT NULL DEFAULT (now()),
  \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT \`mood_logs_id\` PRIMARY KEY(\`id\`)
)`;

const indexSql = `CREATE INDEX IF NOT EXISTS \`mood_logs_user_date\` ON \`mood_logs\` (\`userId\`,\`date\`)`;

const conn = await createConnection(process.env.DATABASE_URL);
try {
  await conn.execute(sql);
  console.log("✓ mood_logs table created");
  try {
    await conn.execute(indexSql);
    console.log("✓ index created");
  } catch (e) {
    // index may already exist
    console.log("index note:", e.message);
  }
} finally {
  await conn.end();
}
