import { LLMProvider } from "../llm/types";
import { EmbeddingProvider } from "../embedding";
import { getMemoryRepository } from "../repositories";
import { MemoryExtractor } from "./extractor";
import { MemoryHandler, ProcessingStats } from "./handler";
import { ConversationContext, ExtractionResult } from "./types";

export interface MemoryServiceConfig {
  /** LLM provider for extraction */
  llmProvider: LLMProvider;
  /** Embedding provider (optional) */
  embeddingProvider?: EmbeddingProvider;
  /** Minimum confidence for extraction (default: 0.5) */
  minConfidence?: number;
  /** Enable auto extraction (default: true) */
  autoExtract?: boolean;
}

/**
 * Memory management service
 *
 * Extract memories from conversations and handle storage/retrieval
 */
export class MemoryService {
  private extractor: MemoryExtractor;
  private handler: MemoryHandler;
  private memoryRepo = getMemoryRepository();
  private minConfidence: number;
  private autoExtract: boolean;

  constructor(config: MemoryServiceConfig) {
    this.extractor = new MemoryExtractor(config.llmProvider);
    this.handler = new MemoryHandler(config.embeddingProvider);
    this.minConfidence = config.minConfidence ?? 0.5;
    this.autoExtract = config.autoExtract ?? true;
  }

  /**
   * Extract and save memories after conversation turn
   */
  async processConversation(
    userId: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    relatedMemoryIds: string[] = []
  ): Promise<ProcessingStats | null> {
    if (!this.autoExtract) {
      return null;
    }

    // Get existing profiles
    const profiles = await this.memoryRepo.findProfiles(userId);
    const existingProfiles = profiles.map((p) => ({
      id: p.id,
      key: p.title,
      value: p.content,
    }));

    // Get related memories
    const relatedMemories: ConversationContext["relatedMemories"] = [];
    for (const id of relatedMemoryIds) {
      const memory = await this.memoryRepo.findById(id);
      if (memory) {
        relatedMemories.push({
          id: memory.id,
          title: memory.title,
          content: memory.content,
          kind: memory.kind,
        });
      }
    }

    // Build context
    const context: ConversationContext = {
      userId,
      recentMessages: messages,
      existingProfiles,
      relatedMemories,
    };

    // Execute extraction
    const result = await this.extractor.extract(context);

    // Filter by minimum confidence
    const filteredResult: ExtractionResult = {
      profileUpdates: result.profileUpdates.filter((p) => p.confidence >= this.minConfidence),
      memoriesToUpsert: result.memoriesToUpsert.filter((m) => m.importance >= this.minConfidence),
      archiveCandidates: result.archiveCandidates,
      skipReason: result.skipReason,
    };

    // Skip if no extraction results
    if (
      filteredResult.profileUpdates.length === 0 &&
      filteredResult.memoriesToUpsert.length === 0 &&
      filteredResult.archiveCandidates.length === 0
    ) {
      return null;
    }

    // Save to database
    return this.handler.process(userId, filteredResult);
  }

  /**
   * Search similar memories
   */
  async searchSimilarMemories(
    userId: string,
    queryVector: number[],
    options?: {
      topK?: number;
      threshold?: number;
      kind?: "profile" | "episode" | "knowledge";
    }
  ) {
    return this.memoryRepo.searchSimilar(userId, queryVector, options);
  }

  /**
   * Get profile memories
   */
  async getProfiles(userId: string) {
    return this.memoryRepo.findProfiles(userId);
  }

  /**
   * Record memory usage
   */
  async touchMemories(ids: string[]) {
    return this.memoryRepo.touchMany(ids);
  }

  /**
   * Backfill embeddings
   */
  async backfillEmbeddings(userId: string) {
    return this.handler.backfillEmbeddings(userId);
  }
}
