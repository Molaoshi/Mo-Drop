import path from "node:path";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { getDb } from "./queries/connection";

// Apply committed migrations at boot (production). In dev, `npm run db:push` is used instead.
export async function runMigrations() {
  try {
    await migrate(getDb(), {
      migrationsFolder: path.resolve(process.cwd(), "db", "migrations"),
    });
    console.log("[migrate] schema up to date");
  } catch (err) {
    console.error("[migrate] failed:", err);
  }
}
