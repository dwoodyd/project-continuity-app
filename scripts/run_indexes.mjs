import { createConnection } from 'mysql2/promise';
import { readFileSync } from 'fs';

const sql = readFileSync('./drizzle/0012_add_userid_indexes.sql', 'utf8');
const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));

const conn = await createConnection(process.env.DATABASE_URL);
let ok = 0, skip = 0, err = 0;
for (const stmt of statements) {
  try {
    await conn.execute(stmt);
    ok++;
  } catch (e) {
    if (e.code === 'ER_DUP_KEYNAME') {
      skip++;
    } else {
      console.error('ERROR:', stmt.slice(0, 60), '->', e.message);
      err++;
    }
  }
}
await conn.end();
console.log(`Done. Created: ${ok}  Skipped (already exist): ${skip}  Errors: ${err}`);
