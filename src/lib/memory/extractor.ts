import { LLMProvider } from "../llm/types";
import { ConversationContext, ExtractionResult } from "./types";
import { getExtractionSystemPrompt, buildExtractionPrompt } from "./prompts";

/**
 * Service for extracting memories from conversations
 */
export class MemoryExtractor {
  constructor(private llmProvider: LLMProvider) {}

  /**
   * Extract memories from a conversation
   */
  async extract(context: ConversationContext): Promise<ExtractionResult> {
    // Skip if conversation is too short
    if (context.recentMessages.length < 2) {
      return {
        profileUpdates: [],
        memoriesToUpsert: [],
        archiveCandidates: [],
        skipReason: "Conversation too short",
      };
    }

    const userPrompt = buildExtractionPrompt(context);

    const result = await this.llmProvider.chat({
      messages: [
        { role: "system", content: getExtractionSystemPrompt() },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 1000,
      temperature: 0.3, // Lower temperature for stable output
    });

    return this.parseExtractionResult(result.content);
  }

  /**
   * Parse LLM output into ExtractionResult
   */
  private parseExtractionResult(content: string): ExtractionResult {
    const emptyResult: ExtractionResult = {
      profileUpdates: [],
      memoriesToUpsert: [],
      archiveCandidates: [],
    };

    try {
      // Extract JSON from markdown code block (handles ```json, ```JSON, ``` etc.)
      let jsonStr = content;

      // Try to extract from code block with closing ```
      const jsonMatch = content.match(/```(?:json|JSON)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        // Handle case where closing ``` is missing (LLM output may be truncated)
        const startMatch = content.match(/```(?:json|JSON)?\s*\n?([\s\S]*)/);
        if (startMatch) {
          jsonStr = startMatch[1];
        }
      }

      // Remove any trailing ``` if still present
      jsonStr = jsonStr.replace(/```\s*$/, "").trim();

      // Parse JSON
      const parsed = JSON.parse(jsonStr.trim());

      // Validate and build result
      const result: ExtractionResult = {
        profileUpdates: [],
        memoriesToUpsert: [],
        archiveCandidates: [],
        skipReason: parsed.skipReason,
      };

      // Validate profileUpdates
      if (Array.isArray(parsed.profileUpdates)) {
        for (const update of parsed.profileUpdates) {
          if (
            typeof update.key === "string" &&
            typeof update.value === "string" &&
            typeof update.confidence === "number"
          ) {
            result.profileUpdates.push({
              key: update.key,
              value: update.value,
              confidence: Math.max(0, Math.min(1, update.confidence)),
            });
          }
        }
      }

      // Validate memoriesToUpsert
      if (Array.isArray(parsed.memoriesToUpsert)) {
        for (const memory of parsed.memoriesToUpsert) {
          if (
            ["profile", "episode", "knowledge"].includes(memory.kind) &&
            typeof memory.title === "string" &&
            typeof memory.content === "string"
          ) {
            result.memoriesToUpsert.push({
              kind: memory.kind,
              title: memory.title,
              content: memory.content,
              tags: Array.isArray(memory.tags) ? memory.tags.filter((t: unknown) => typeof t === "string") : [],
              importance: typeof memory.importance === "number" ? Math.max(0, Math.min(1, memory.importance)) : 0.5,
              existingMemoryId: typeof memory.existingMemoryId === "string" ? memory.existingMemoryId : undefined,
            });
          }
        }
      }

      // Validate archiveCandidates
      if (Array.isArray(parsed.archiveCandidates)) {
        for (const candidate of parsed.archiveCandidates) {
          if (typeof candidate.memoryId === "string" && typeof candidate.reason === "string") {
            result.archiveCandidates.push({
              memoryId: candidate.memoryId,
              reason: candidate.reason,
            });
          }
        }
      }

      return result;
    } catch (error) {
      console.error("[MemoryExtractor] Failed to parse extraction result:", error);
      console.error("[MemoryExtractor] Raw content:", content);
      return emptyResult;
    }
  }
}
