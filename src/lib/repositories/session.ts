import { eq, desc, and } from "drizzle-orm";
import { getDb, sessions, messages, type Session, type Message } from "../db";

// ============================================
// Types
// ============================================

export interface SessionWithMessages extends Session {
  messages: Message[];
}

export interface CreateMessageInput {
  sessionId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
}

// ============================================
// Session Repository
// ============================================

export class SessionRepository {
  /**
   * Create a new session
   */
  async create(userId: string): Promise<Session> {
    const db = getDb();
    const id = crypto.randomUUID();

    const [session] = await db
      .insert(sessions)
      .values({
        id,
        userId,
        createdAt: new Date(),
      })
      .returning();

    return session;
  }

  /**
   * Find a session by ID
   */
  async findById(id: string): Promise<Session | null> {
    const db = getDb();
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return session ?? null;
  }

  /**
   * Find a session by ID with messages
   */
  async findByIdWithMessages(id: string): Promise<SessionWithMessages | null> {
    const db = getDb();

    const [session] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);

    if (!session) return null;

    const sessionMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, id))
      .orderBy(messages.createdAt);

    return {
      ...session,
      messages: sessionMessages,
    };
  }

  /**
   * Get sessions by user ID
   */
  async findByUserId(userId: string, limit: number = 50): Promise<Session[]> {
    const db = getDb();

    return db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt))
      .limit(limit);
  }

  /**
   * Get the latest session for a user
   */
  async findLatestByUserId(userId: string): Promise<Session | null> {
    const db = getDb();

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.createdAt))
      .limit(1);

    return session ?? null;
  }

  /**
   * Update session summary
   */
  async updateSummary(id: string, summary: string): Promise<Session | null> {
    const db = getDb();

    const [updated] = await db
      .update(sessions)
      .set({ summary })
      .where(eq(sessions.id, id))
      .returning();

    return updated ?? null;
  }

  /**
   * Delete a session
   */
  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(sessions).where(eq(sessions.id, id)).returning();
    return result.length > 0;
  }

  // ============================================
  // Message related
  // ============================================

  /**
   * Add a message to a session
   */
  async addMessage(input: CreateMessageInput): Promise<Message> {
    const db = getDb();
    const id = crypto.randomUUID();

    const [message] = await db
      .insert(messages)
      .values({
        id,
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        createdAt: new Date(),
      })
      .returning();

    return message;
  }

  /**
   * Get messages for a session
   */
  async getMessages(sessionId: string, limit?: number): Promise<Message[]> {
    const db = getDb();

    let query = db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(messages.createdAt);

    if (limit) {
      query = query.limit(limit) as typeof query;
    }

    return query;
  }

  /**
   * Get the most recent N messages for a session
   */
  async getRecentMessages(sessionId: string, count: number): Promise<Message[]> {
    const db = getDb();

    // Get latest N messages with subquery, ordered by creation time
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.createdAt))
      .limit(count);

    // Return in chronological order
    return recentMessages.reverse();
  }

  /**
   * Get message count for a session
   */
  async getMessageCount(sessionId: string): Promise<number> {
    const db = getDb();

    const result = await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId));

    return result.length;
  }
}

// Singleton instance
let instance: SessionRepository | null = null;

export function getSessionRepository(): SessionRepository {
  if (!instance) {
    instance = new SessionRepository();
  }
  return instance;
}
