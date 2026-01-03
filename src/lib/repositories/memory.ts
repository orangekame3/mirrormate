import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getDb, memories, memoryEmbeddings, type Memory, type NewMemory } from "../db";
import { bufferToVector, vectorToBuffer, cosineSimilarity } from "../embedding";

// ============================================
// Types
// ============================================

export interface MemoryWithEmbedding extends Memory {
  embedding?: {
    model: string;
    dims: number;
    vector: number[];
  };
}

export interface MemorySearchResult {
  memory: Memory;
  similarity: number;
}

export interface CreateMemoryInput {
  userId: string;
  kind: "profile" | "episode" | "knowledge";
  title: string;
  content: string;
  tags?: string[];
  importance?: number;
  source?: "manual" | "extracted";
}

export interface UpdateMemoryInput {
  title?: string;
  content?: string;
  tags?: string[];
  importance?: number;
  status?: "active" | "archived" | "deleted";
}

export interface MemoryFilter {
  userId: string;
  kind?: "profile" | "episode" | "knowledge";
  status?: "active" | "archived" | "deleted";
  tags?: string[];
  minImportance?: number;
}

// ============================================
// Memory Repository
// ============================================

export class MemoryRepository {
  /**
   * Create a new memory
   */
  async create(input: CreateMemoryInput): Promise<Memory> {
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date();

    const [memory] = await db
      .insert(memories)
      .values({
        id,
        userId: input.userId,
        kind: input.kind,
        title: input.title,
        content: input.content,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        importance: input.importance ?? 0.5,
        source: input.source ?? "extracted",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return memory;
  }

  /**
   * Find a memory by ID
   */
  async findById(id: string): Promise<Memory | null> {
    const db = getDb();
    const [memory] = await db.select().from(memories).where(eq(memories.id, id)).limit(1);
    return memory ?? null;
  }

  /**
   * Find a memory by ID with embedding
   */
  async findByIdWithEmbedding(id: string): Promise<MemoryWithEmbedding | null> {
    const db = getDb();

    const [memory] = await db.select().from(memories).where(eq(memories.id, id)).limit(1);

    if (!memory) return null;

    const [embedding] = await db
      .select()
      .from(memoryEmbeddings)
      .where(eq(memoryEmbeddings.memoryId, id))
      .limit(1);

    if (!embedding) {
      return memory;
    }

    return {
      ...memory,
      embedding: {
        model: embedding.model,
        dims: embedding.dims,
        vector: bufferToVector(embedding.vector),
      },
    };
  }

  /**
   * Find memories by filter conditions
   */
  async findMany(filter: MemoryFilter, limit: number = 100): Promise<Memory[]> {
    const db = getDb();

    const conditions = [eq(memories.userId, filter.userId)];

    if (filter.kind) {
      conditions.push(eq(memories.kind, filter.kind));
    }

    if (filter.status) {
      conditions.push(eq(memories.status, filter.status));
    } else {
      // Default to active only
      conditions.push(eq(memories.status, "active"));
    }

    if (filter.minImportance !== undefined) {
      conditions.push(sql`${memories.importance} >= ${filter.minImportance}`);
    }

    const results = await db
      .select()
      .from(memories)
      .where(and(...conditions))
      .orderBy(desc(memories.updatedAt))
      .limit(limit);

    // Post-process tags filter (stored as JSON)
    if (filter.tags && filter.tags.length > 0) {
      return results.filter((memory) => {
        if (!memory.tags) return false;
        const memoryTags = JSON.parse(memory.tags) as string[];
        return filter.tags!.some((tag) => memoryTags.includes(tag));
      });
    }

    return results;
  }

  /**
   * Get all profile memories for a user
   */
  async findProfiles(userId: string): Promise<Memory[]> {
    return this.findMany({ userId, kind: "profile", status: "active" });
  }

  /**
   * Update a memory
   */
  async update(id: string, input: UpdateMemoryInput): Promise<Memory | null> {
    const db = getDb();

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.tags !== undefined) updateData.tags = JSON.stringify(input.tags);
    if (input.importance !== undefined) updateData.importance = input.importance;
    if (input.status !== undefined) updateData.status = input.status;

    const [updated] = await db
      .update(memories)
      .set(updateData)
      .where(eq(memories.id, id))
      .returning();

    return updated ?? null;
  }

  /**
   * Delete a memory (soft delete)
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await this.update(id, { status: "deleted" });
    return result !== null;
  }

  /**
   * Delete a memory permanently (hard delete)
   */
  async hardDelete(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db.delete(memories).where(eq(memories.id, id)).returning();
    return result.length > 0;
  }

  /**
   * Update memory last used timestamp
   */
  async touch(id: string): Promise<void> {
    const db = getDb();
    await db.update(memories).set({ lastUsedAt: new Date() }).where(eq(memories.id, id));
  }

  /**
   * Update last used timestamp for multiple memories
   */
  async touchMany(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = getDb();
    await db
      .update(memories)
      .set({ lastUsedAt: new Date() })
      .where(inArray(memories.id, ids));
  }

  // ============================================
  // Embedding related
  // ============================================

  /**
   * Save embedding for a memory
   */
  async saveEmbedding(
    memoryId: string,
    vector: number[],
    model: string,
    dims: number
  ): Promise<void> {
    const db = getDb();
    const id = crypto.randomUUID();

    // Delete existing embedding if present
    await db.delete(memoryEmbeddings).where(eq(memoryEmbeddings.memoryId, memoryId));

    // Save new embedding
    await db.insert(memoryEmbeddings).values({
      id,
      memoryId,
      model,
      dims,
      vector: vectorToBuffer(vector),
      createdAt: new Date(),
    });
  }

  /**
   * Search for similar memories
   */
  async searchSimilar(
    userId: string,
    queryVector: number[],
    options: {
      topK?: number;
      threshold?: number;
      kind?: "profile" | "episode" | "knowledge";
      excludeIds?: string[];
    } = {}
  ): Promise<MemorySearchResult[]> {
    const { topK = 10, threshold = 0.3, kind, excludeIds = [] } = options;

    const db = getDb();

    // First, get target memories
    const conditions = [eq(memories.userId, userId), eq(memories.status, "active")];

    if (kind) {
      conditions.push(eq(memories.kind, kind));
    }

    const targetMemories = await db
      .select({
        memory: memories,
        embedding: memoryEmbeddings,
      })
      .from(memories)
      .innerJoin(memoryEmbeddings, eq(memories.id, memoryEmbeddings.memoryId))
      .where(and(...conditions));

    // Calculate similarity
    const results: MemorySearchResult[] = targetMemories
      .filter((row) => !excludeIds.includes(row.memory.id))
      .map((row) => {
        const vector = bufferToVector(row.embedding.vector);
        const similarity = cosineSimilarity(queryVector, vector);
        return {
          memory: row.memory,
          similarity,
        };
      })
      .filter((result) => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return results;
  }

  /**
   * Find memories without embeddings
   */
  async findWithoutEmbedding(userId: string, limit: number = 100): Promise<Memory[]> {
    const db = getDb();

    const result = await db
      .select({ memory: memories })
      .from(memories)
      .leftJoin(memoryEmbeddings, eq(memories.id, memoryEmbeddings.memoryId))
      .where(
        and(
          eq(memories.userId, userId),
          eq(memories.status, "active"),
          sql`${memoryEmbeddings.id} IS NULL`
        )
      )
      .limit(limit);

    return result.map((r) => r.memory);
  }
}

// Singleton instance
let instance: MemoryRepository | null = null;

export function getMemoryRepository(): MemoryRepository {
  if (!instance) {
    instance = new MemoryRepository();
  }
  return instance;
}
