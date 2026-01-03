import { ExtractionResult, ProfileUpdate } from "./types";
import { getMemoryRepository } from "../repositories";
import { EmbeddingProvider } from "../embedding";
import { Memory } from "../db";

export interface ProcessingStats {
  profilesUpdated: number;
  memoriesCreated: number;
  memoriesUpdated: number;
  memoriesArchived: number;
  embeddingsGenerated: number;
}

/**
 * Process extraction results and save to database
 */
export class MemoryHandler {
  private memoryRepo = getMemoryRepository();

  constructor(private embeddingProvider?: EmbeddingProvider) {}

  /**
   * Process extraction results
   */
  async process(userId: string, result: ExtractionResult): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      profilesUpdated: 0,
      memoriesCreated: 0,
      memoriesUpdated: 0,
      memoriesArchived: 0,
      embeddingsGenerated: 0,
    };

    // 1. Process profile updates
    for (const update of result.profileUpdates) {
      const processed = await this.processProfileUpdate(userId, update);
      if (processed) {
        stats.profilesUpdated++;
      }
    }

    // 2. Process memory upserts
    for (const upsert of result.memoriesToUpsert) {
      if (upsert.existingMemoryId) {
        // Update existing memory
        const updated = await this.memoryRepo.update(upsert.existingMemoryId, {
          title: upsert.title,
          content: upsert.content,
          tags: upsert.tags,
          importance: upsert.importance,
        });
        if (updated) {
          stats.memoriesUpdated++;
          // Regenerate embedding
          if (this.embeddingProvider) {
            await this.generateEmbedding(updated);
            stats.embeddingsGenerated++;
          }
        }
      } else {
        // Create new memory
        const created = await this.memoryRepo.create({
          userId,
          kind: upsert.kind,
          title: upsert.title,
          content: upsert.content,
          tags: upsert.tags,
          importance: upsert.importance,
          source: "extracted",
        });
        stats.memoriesCreated++;
        // Generate embedding
        if (this.embeddingProvider) {
          await this.generateEmbedding(created);
          stats.embeddingsGenerated++;
        }
      }
    }

    // 3. Process archive candidates
    for (const candidate of result.archiveCandidates) {
      const archived = await this.memoryRepo.update(candidate.memoryId, {
        status: "archived",
      });
      if (archived) {
        stats.memoriesArchived++;
      }
    }

    return stats;
  }

  /**
   * Process profile update
   *
   * Find existing profile and update, or create new one
   */
  private async processProfileUpdate(userId: string, update: ProfileUpdate): Promise<boolean> {
    // Skip if confidence is too low
    if (update.confidence < 0.5) {
      return false;
    }

    // Search for existing profile (matching title with key)
    const existingProfiles = await this.memoryRepo.findProfiles(userId);
    const existing = existingProfiles.find(
      (p) => p.title.toLowerCase() === update.key.toLowerCase()
    );

    if (existing) {
      // Update existing profile
      await this.memoryRepo.update(existing.id, {
        content: update.value,
        // Keep importance non-decreasing by taking the maximum of the existing importance
        // and the new confidence. This avoids lowering importance on lower-confidence updates
        // and reflects that importance represents the best (highest) confidence seen so far.
        importance: Math.max(existing.importance, update.confidence),
      });
    } else {
      // Create new profile
      const created = await this.memoryRepo.create({
        userId,
        kind: "profile",
        title: update.key,
        content: update.value,
        importance: update.confidence,
        source: "extracted",
      });

      // Generate embedding
      if (this.embeddingProvider) {
        await this.generateEmbedding(created);
      }
    }

    return true;
  }

  /**
   * Generate and save embedding for a memory
   */
  private async generateEmbedding(memory: Memory): Promise<void> {
    if (!this.embeddingProvider) {
      return;
    }

    try {
      // Combine title and content for embedding
      const text = `${memory.title}: ${memory.content}`;
      const result = await this.embeddingProvider.embed(text);

      await this.memoryRepo.saveEmbedding(
        memory.id,
        result.vector,
        result.model,
        result.dims
      );
    } catch (error) {
      console.error(`[MemoryHandler] Failed to generate embedding for ${memory.id}:`, error);
    }
  }

  /**
   * Backfill embeddings for memories without them
   */
  async backfillEmbeddings(userId: string): Promise<number> {
    if (!this.embeddingProvider) {
      return 0;
    }

    const memories = await this.memoryRepo.findWithoutEmbedding(userId);
    let count = 0;

    for (const memory of memories) {
      try {
        await this.generateEmbedding(memory);
        count++;
      } catch (error) {
        console.error(`[MemoryHandler] Failed to backfill embedding for ${memory.id}:`, error);
      }
    }

    return count;
  }
}
