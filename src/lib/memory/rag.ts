import { Memory } from "../db";
import { getMemoryRepository, MemorySearchResult } from "../repositories";
import { EmbeddingProvider } from "../embedding";

export interface RAGContext {
  /** Profile memories (always included) */
  profiles: Memory[];
  /** Retrieved memories from search */
  retrievedMemories: MemorySearchResult[];
  /** Used memory IDs (for touch tracking) */
  usedMemoryIds: string[];
}

export interface RAGConfig {
  /** Maximum number of memories to retrieve */
  topK?: number;
  /** Similarity threshold */
  threshold?: number;
  /** Include profiles */
  includeProfiles?: boolean;
  /** Include episodes in search */
  includeEpisodes?: boolean;
  /** Include knowledge in search */
  includeKnowledge?: boolean;
}

const DEFAULT_CONFIG: Required<RAGConfig> = {
  topK: 8,
  threshold: 0.3,
  includeProfiles: true,
  includeEpisodes: true,
  includeKnowledge: true,
};

/**
 * RAG (Retrieval-Augmented Generation) service
 */
export class RAGService {
  private memoryRepo = getMemoryRepository();

  constructor(private embeddingProvider: EmbeddingProvider) {}

  /**
   * Retrieve memories related to user input
   */
  async retrieve(
    userId: string,
    userInput: string,
    config: RAGConfig = {}
  ): Promise<RAGContext> {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    const context: RAGContext = {
      profiles: [],
      retrievedMemories: [],
      usedMemoryIds: [],
    };

    // 1. Get profiles (always included)
    if (cfg.includeProfiles) {
      context.profiles = await this.memoryRepo.findProfiles(userId);
      context.usedMemoryIds.push(...context.profiles.map((p) => p.id));
    }

    // 2. Embed user input
    const queryEmbedding = await this.embeddingProvider.embed(userInput);

    // 3. Search similar memories
    const searchResults: MemorySearchResult[] = [];

    if (cfg.includeEpisodes) {
      const episodes = await this.memoryRepo.searchSimilar(userId, queryEmbedding.vector, {
        topK: cfg.topK,
        threshold: cfg.threshold,
        kind: "episode",
      });
      searchResults.push(...episodes);
    }

    if (cfg.includeKnowledge) {
      const knowledge = await this.memoryRepo.searchSimilar(userId, queryEmbedding.vector, {
        topK: cfg.topK,
        threshold: cfg.threshold,
        kind: "knowledge",
      });
      searchResults.push(...knowledge);
    }

    // 4. Deduplicate and sort
    const seen = new Set<string>();
    const deduplicated = searchResults.filter((r) => {
      if (seen.has(r.memory.id)) return false;
      seen.add(r.memory.id);
      return true;
    });

    // Sort by similarity and take top K
    context.retrievedMemories = deduplicated
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, cfg.topK);

    context.usedMemoryIds.push(...context.retrievedMemories.map((r) => r.memory.id));

    return context;
  }

  /**
   * Format RAG context as prompt string
   */
  formatContext(context: RAGContext): string {
    const sections: string[] = [];

    // Profile section
    if (context.profiles.length > 0) {
      sections.push("[User Profile]");
      for (const profile of context.profiles) {
        sections.push(`- ${profile.title}: ${profile.content}`);
      }
      sections.push("");
    }

    // Retrieved memories section
    if (context.retrievedMemories.length > 0) {
      sections.push("[Related Information]");
      for (const { memory, similarity } of context.retrievedMemories) {
        const kindLabel = memory.kind === "episode" ? "Recent" : "Note";
        // Highlight high similarity items
        const prefix = similarity > 0.7 ? "[Important] " : "";
        sections.push(`- ${prefix}(${kindLabel}) ${memory.title}: ${memory.content}`);
      }
      sections.push("");
    }

    return sections.join("\n");
  }
}

/**
 * Get simple context without RAG
 * (Fallback when embedding provider is not available)
 */
export async function getSimpleContext(userId: string): Promise<string> {
  const memoryRepo = getMemoryRepository();
  const profiles = await memoryRepo.findProfiles(userId);

  if (profiles.length === 0) {
    return "";
  }

  const lines = ["[User Profile]"];
  for (const profile of profiles) {
    lines.push(`- ${profile.title}: ${profile.content}`);
  }

  return lines.join("\n");
}
