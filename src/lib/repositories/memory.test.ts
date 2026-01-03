import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../db/schema";
import { MemoryRepository } from "./memory";
import { cosineSimilarity, vectorToBuffer, bufferToVector } from "../embedding";

// テスト用のインメモリDB
let testDb: ReturnType<typeof drizzle<typeof schema>>;
let sqlite: Database.Database;
let repo: MemoryRepository;
const TEST_USER_ID = "test-user-001";

// getDb をモック
import * as dbModule from "../db";
import { vi } from "vitest";

vi.mock("../db", async () => {
  const actual = await vi.importActual<typeof dbModule>("../db");
  return {
    ...actual,
    getDb: () => testDb,
  };
});

beforeEach(async () => {
  // インメモリDBを作成
  sqlite = new Database(":memory:");
  testDb = drizzle(sqlite, { schema });

  // スキーマを作成
  sqlite.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      summary TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE messages (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE memories (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      importance REAL DEFAULT 0.5 NOT NULL,
      status TEXT DEFAULT 'active' NOT NULL,
      source TEXT DEFAULT 'extracted' NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_used_at INTEGER
    );
    CREATE TABLE memory_embeddings (
      id TEXT PRIMARY KEY NOT NULL,
      memory_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
      model TEXT NOT NULL,
      dims INTEGER NOT NULL,
      vector BLOB NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // テストユーザーを作成
  sqlite.exec(`INSERT INTO users (id, created_at) VALUES ('${TEST_USER_ID}', ${Date.now()})`);

  repo = new MemoryRepository();
});

afterEach(() => {
  sqlite.close();
});

describe("MemoryRepository", () => {
  describe("create", () => {
    it("creates a memory with default values", async () => {
      const memory = await repo.create({
        userId: TEST_USER_ID,
        kind: "knowledge",
        title: "Test Memory",
        content: "This is a test memory",
      });

      expect(memory.id).toBeDefined();
      expect(memory.userId).toBe(TEST_USER_ID);
      expect(memory.kind).toBe("knowledge");
      expect(memory.title).toBe("Test Memory");
      expect(memory.content).toBe("This is a test memory");
      expect(memory.importance).toBe(0.5);
      expect(memory.status).toBe("active");
      expect(memory.source).toBe("extracted");
    });

    it("creates a memory with custom values", async () => {
      const memory = await repo.create({
        userId: TEST_USER_ID,
        kind: "profile",
        title: "User Preference",
        content: "User prefers concise responses",
        tags: ["preference", "tone"],
        importance: 0.9,
        source: "manual",
      });

      expect(memory.kind).toBe("profile");
      expect(memory.importance).toBe(0.9);
      expect(memory.source).toBe("manual");
      expect(JSON.parse(memory.tags!)).toEqual(["preference", "tone"]);
    });
  });

  describe("findById", () => {
    it("returns memory when found", async () => {
      const created = await repo.create({
        userId: TEST_USER_ID,
        kind: "knowledge",
        title: "Test",
        content: "Content",
      });

      const found = await repo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it("returns null when not found", async () => {
      const found = await repo.findById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("findMany", () => {
    it("filters by kind", async () => {
      await repo.create({
        userId: TEST_USER_ID,
        kind: "profile",
        title: "Profile 1",
        content: "Content",
      });
      await repo.create({
        userId: TEST_USER_ID,
        kind: "knowledge",
        title: "Knowledge 1",
        content: "Content",
      });

      const profiles = await repo.findMany({ userId: TEST_USER_ID, kind: "profile" });
      expect(profiles).toHaveLength(1);
      expect(profiles[0].kind).toBe("profile");
    });

    it("filters by status", async () => {
      const memory = await repo.create({
        userId: TEST_USER_ID,
        kind: "knowledge",
        title: "Test",
        content: "Content",
      });
      await repo.update(memory.id, { status: "archived" });

      const active = await repo.findMany({ userId: TEST_USER_ID, status: "active" });
      const archived = await repo.findMany({ userId: TEST_USER_ID, status: "archived" });

      expect(active).toHaveLength(0);
      expect(archived).toHaveLength(1);
    });

    it("filters by minImportance", async () => {
      await repo.create({
        userId: TEST_USER_ID,
        kind: "knowledge",
        title: "Low importance",
        content: "Content",
        importance: 0.3,
      });
      await repo.create({
        userId: TEST_USER_ID,
        kind: "knowledge",
        title: "High importance",
        content: "Content",
        importance: 0.8,
      });

      const important = await repo.findMany({
        userId: TEST_USER_ID,
        minImportance: 0.5,
      });

      expect(important).toHaveLength(1);
      expect(important[0].title).toBe("High importance");
    });
  });

  describe("update", () => {
    it("updates memory fields", async () => {
      const memory = await repo.create({
        userId: TEST_USER_ID,
        kind: "knowledge",
        title: "Original",
        content: "Original content",
      });

      const updated = await repo.update(memory.id, {
        title: "Updated",
        content: "Updated content",
        importance: 0.8,
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe("Updated");
      expect(updated!.content).toBe("Updated content");
      expect(updated!.importance).toBe(0.8);
    });
  });

  describe("softDelete", () => {
    it("marks memory as deleted", async () => {
      const memory = await repo.create({
        userId: TEST_USER_ID,
        kind: "knowledge",
        title: "Test",
        content: "Content",
      });

      const result = await repo.softDelete(memory.id);
      expect(result).toBe(true);

      const found = await repo.findById(memory.id);
      expect(found!.status).toBe("deleted");
    });
  });

  describe("hardDelete", () => {
    it("completely removes memory", async () => {
      const memory = await repo.create({
        userId: TEST_USER_ID,
        kind: "knowledge",
        title: "Test",
        content: "Content",
      });

      const result = await repo.hardDelete(memory.id);
      expect(result).toBe(true);

      const found = await repo.findById(memory.id);
      expect(found).toBeNull();
    });
  });
});

describe("Vector utilities", () => {
  describe("cosineSimilarity", () => {
    it("returns 1 for identical vectors", () => {
      const v = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
    });

    it("returns 0 for orthogonal vectors", () => {
      const v1 = [1, 0];
      const v2 = [0, 1];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(0.0);
    });

    it("returns -1 for opposite vectors", () => {
      const v1 = [1, 2, 3];
      const v2 = [-1, -2, -3];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(-1.0);
    });
  });

  describe("vectorToBuffer / bufferToVector", () => {
    it("round-trips correctly", () => {
      const original = [0.1, 0.2, 0.3, -0.4, 0.5];
      const buffer = vectorToBuffer(original);
      const restored = bufferToVector(buffer);

      expect(restored).toHaveLength(original.length);
      for (let i = 0; i < original.length; i++) {
        expect(restored[i]).toBeCloseTo(original[i], 5);
      }
    });
  });
});
