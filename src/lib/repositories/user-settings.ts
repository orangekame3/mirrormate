import { eq } from "drizzle-orm";
import { getDb, userSettings, type UserSettings } from "../db";

// ============================================
// User Settings Repository
// ============================================

export interface UpdateSettingsInput {
  speakerId?: number | null;
  characterId?: string | null;
}

export class UserSettingsRepository {
  /**
   * Get settings for a user, creating default settings if not exists
   */
  async findOrCreate(userId: string): Promise<UserSettings> {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Create default settings
    const [created] = await db
      .insert(userSettings)
      .values({
        id: crypto.randomUUID(),
        userId,
        speakerId: null,
        characterId: null,
        updatedAt: new Date(),
      })
      .returning();

    return created;
  }

  /**
   * Find settings by user ID
   */
  async findByUserId(userId: string): Promise<UserSettings | null> {
    const db = getDb();
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    return settings ?? null;
  }

  /**
   * Update settings for a user
   */
  async update(userId: string, input: UpdateSettingsInput): Promise<UserSettings> {
    const db = getDb();

    // Ensure settings exist
    await this.findOrCreate(userId);

    const [updated] = await db
      .update(userSettings)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId))
      .returning();

    return updated;
  }

  /**
   * Delete settings for a user
   */
  async delete(userId: string): Promise<boolean> {
    const db = getDb();
    const result = await db
      .delete(userSettings)
      .where(eq(userSettings.userId, userId))
      .returning();

    return result.length > 0;
  }
}

// Singleton instance
let instance: UserSettingsRepository | null = null;

export function getUserSettingsRepository(): UserSettingsRepository {
  if (!instance) {
    instance = new UserSettingsRepository();
  }
  return instance;
}
