import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import { getLocale, type Locale } from "../app";

// Determine the database file path
function getDbPath(): string {
  // Use environment variable if specified
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  const dataDir = path.join(process.cwd(), "data");

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Use locale-specific database file
  const locale = getLocale();
  return path.join(dataDir, `mirrormate.${locale}.db`);
}

// Initialize database schema if tables don't exist
function initializeSchema(sqlite: Database.Database): void {
  // Check if users table exists
  const tableCheck = sqlite.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  ).get();

  if (!tableCheck) {
    console.log("[DB] Initializing database schema...");

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        summary TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system', 'tool')),
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK(kind IN ('profile', 'episode', 'knowledge')),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        importance REAL NOT NULL DEFAULT 0.5,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'deleted')),
        source TEXT NOT NULL DEFAULT 'extracted' CHECK(source IN ('manual', 'extracted')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS memory_embeddings (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
        model TEXT NOT NULL,
        dims INTEGER NOT NULL,
        vector BLOB NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        speaker_id INTEGER,
        character_id TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_kind ON memories(kind);
      CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
      CREATE INDEX IF NOT EXISTS idx_memory_embeddings_memory_id ON memory_embeddings(memory_id);
      CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
    `);

    console.log("[DB] Schema initialized successfully");
  } else {
    // Run migrations for existing databases
    runMigrations(sqlite);
  }
}

// Run migrations for existing databases
function runMigrations(sqlite: Database.Database): void {
  // Migration: Add user_settings table if it doesn't exist
  const userSettingsCheck = sqlite.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='user_settings'"
  ).get();

  if (!userSettingsCheck) {
    console.log("[DB] Running migration: Adding user_settings table...");
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        speaker_id INTEGER,
        character_id TEXT,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
    `);
    console.log("[DB] Migration complete: user_settings table added");
  }
}

// Manage DB connection with singleton pattern
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: Database.Database | null = null;
let currentLocale: Locale | null = null;

export function getDb() {
  const locale = getLocale();

  // Reconnect if locale changed
  if (currentLocale !== null && currentLocale !== locale) {
    console.log(`[DB] Locale changed from ${currentLocale} to ${locale}, reconnecting...`);
    closeDb();
  }

  if (!db) {
    const dbPath = getDbPath();
    console.log(`[DB] Connecting to: ${dbPath}`);
    sqlite = new Database(dbPath);
    // Enable WAL mode for better performance
    sqlite.pragma("journal_mode = WAL");
    // Initialize schema if needed
    initializeSchema(sqlite);
    db = drizzle(sqlite, { schema });
    currentLocale = locale;
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
