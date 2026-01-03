/**
 * Memory extraction type definitions
 */

/**
 * Profile update candidate
 */
export interface ProfileUpdate {
  /** Profile key (e.g., "tone", "interests", "preferences") */
  key: string;
  /** Value */
  value: string;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
}

/**
 * Memory upsert candidate
 */
export interface MemoryUpsert {
  /** Memory kind */
  kind: "profile" | "episode" | "knowledge";
  /** Title */
  title: string;
  /** Content */
  content: string;
  /** Tags */
  tags: string[];
  /** Importance score (0.0 - 1.0) */
  importance: number;
  /** Existing memory ID (for updates) */
  existingMemoryId?: string;
}

/**
 * Archive candidate
 */
export interface ArchiveCandidate {
  /** Memory ID */
  memoryId: string;
  /** Reason for archiving */
  reason: string;
}

/**
 * Extraction result from LLM
 */
export interface ExtractionResult {
  /** Profile update candidates */
  profileUpdates: ProfileUpdate[];
  /** Memories to create or update */
  memoriesToUpsert: MemoryUpsert[];
  /** Archive candidates */
  archiveCandidates: ArchiveCandidate[];
  /** Reason for skipping extraction (when nothing to extract) */
  skipReason?: string;
}

/**
 * Conversation context for extraction
 */
export interface ConversationContext {
  /** User ID */
  userId: string;
  /** Recent messages */
  recentMessages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  /** Existing profile memories */
  existingProfiles: Array<{
    id: string;
    key: string;
    value: string;
  }>;
  /** Related existing memories (retrieved via RAG) */
  relatedMemories: Array<{
    id: string;
    title: string;
    content: string;
    kind: string;
  }>;
}
