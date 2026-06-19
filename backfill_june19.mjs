import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // Check June 19 plans
  const [rows] = await conn.execute(
    "SELECT id, date, criticalTasks, tomorrowTasks FROM daily_plans WHERE date = '2026-06-19'"
  );
  console.log("June 19 plans count:", rows.length);
  for (const row of rows) {
    console.log("  id:", row.id, "date:", row.date);
    console.log("  criticalTasks:", row.criticalTasks ? row.criticalTasks.substring(0, 300) : "NULL");
    console.log("  tomorrowTasks:", row.tomorrowTasks ? row.tomorrowTasks.substring(0, 600) : "NULL");
  }

  // Check the evening check-in row 870001
  const [eveningRows] = await conn.execute(
    "SELECT id, date, type, completedAt, SUBSTRING(userInput, 1, 400) as userInput_preview FROM check_ins WHERE id = 870001"
  );
  console.log("\nEvening check-in row 870001:");
  console.log(JSON.stringify(eveningRows, null, 2));

  await conn.end();
}

main().catch(console.error);
