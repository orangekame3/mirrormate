import { eq } from "drizzle-orm";
import { getDb, users, type User } from "../db";

// ============================================
// User Repository
// ============================================

export class UserRepository {
  /**
   * Create a new user
   */
  async create(id?: string): Promise<User> {
    const db = getDb();
    const userId = id ?? crypto.randomUUID();

    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        createdAt: new Date(),
      })
      .returning();

    return user;
  }

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User | null> {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  /**
   * Find a user or create if not exists
   */
  async findOrCreate(id: string): Promise<User> {
    const existing = await this.findById(id);
    if (existing) {
      return existing;
    }
    return this.create(id);
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  /**
   * Get all users
   */
  async findAll(): Promise<User[]> {
    const db = getDb();
    return db.select().from(users);
  }
}

// Singleton instance
let instance: UserRepository | null = null;

export function getUserRepository(): UserRepository {
  if (!instance) {
    instance = new UserRepository();
  }
  return instance;
}
