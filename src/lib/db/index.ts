import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Determine the database file path
function getDbPath(): string {
  // Use environment variable if specified
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  // Default to data/mirrormate.db
  const dataDir = path.join(process.cwd(), "data");

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return path.join(dataDir, "mirrormate.db");
}

// Manage DB connection with singleton pattern
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: Database.Database | null = null;

export function getDb() {
  if (!db) {
    const dbPath = getDbPath();
    sqlite = new Database(dbPath);
    // Enable WAL mode for better performance
    sqlite.pragma("journal_mode = WAL");
    db = drizzle(sqlite, { schema });
  }
  return db;
}

// Reset DB connection for testing
export function resetDb() {
  if (sqlite) {
    sqlite.close();
  }
  db = null;
  sqlite = null;
}

// Close DB connection
export function closeDb() {
  if (sqlite) {
    sqlite.close();
    db = null;
    sqlite = null;
  }
}

// Export schema
export * from "./schema";
