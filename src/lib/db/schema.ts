import { sqliteTable, text, integer, real, blob } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ============================================
// Users
// ============================================
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  memories: many(memories),
}));

// ============================================
// Sessions
// ============================================
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  summary: text("summary"), // Session summary for episode memory
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

// ============================================
// Messages
// ============================================
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system", "tool"] }).notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  session: one(sessions, {
    fields: [messages.sessionId],
    references: [sessions.id],
  }),
}));

// ============================================
// Memories
// ============================================
export const memories = sqliteTable("memories", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["profile", "episode", "knowledge"] }).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags"), // JSON stringified array
  importance: real("importance").notNull().default(0.5), // 0.0 - 1.0
  status: text("status", { enum: ["active", "archived", "deleted"] })
    .notNull()
    .default("active"),
  source: text("source", { enum: ["manual", "extracted"] })
    .notNull()
    .default("extracted"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
});

export const memoriesRelations = relations(memories, ({ one, many }) => ({
  user: one(users, {
    fields: [memories.userId],
    references: [users.id],
  }),
  embeddings: many(memoryEmbeddings),
}));

// ============================================
// Memory Embeddings
// ============================================
export const memoryEmbeddings = sqliteTable("memory_embeddings", {
  id: text("id").primaryKey(),
  memoryId: text("memory_id")
    .notNull()
    .references(() => memories.id, { onDelete: "cascade" }),
  model: text("model").notNull(), // e.g., "bge-m3"
  dims: integer("dims").notNull(), // e.g., 1024
  vector: blob("vector", { mode: "buffer" }).notNull(), // Float32Array as Buffer
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const memoryEmbeddingsRelations = relations(memoryEmbeddings, ({ one }) => ({
  memory: one(memories, {
    fields: [memoryEmbeddings.memoryId],
    references: [memories.id],
  }),
}));

// ============================================
// Type exports
// ============================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;

export type MemoryEmbedding = typeof memoryEmbeddings.$inferSelect;
export type NewMemoryEmbedding = typeof memoryEmbeddings.$inferInsert;
