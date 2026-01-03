import { describe, it, expect, vi } from "vitest";
import { MemoryExtractor } from "./extractor";
import { LLMProvider, ChatCompletionResult } from "../llm/types";
import { ConversationContext } from "./types";

// Mock LLM Provider
function createMockLLM(response: string): LLMProvider {
  return {
    chat: vi.fn().mockResolvedValue({
      content: response,
      finishReason: "stop",
    } as ChatCompletionResult),
    chatStream: vi.fn(),
  };
}

describe("MemoryExtractor", () => {
  describe("extract", () => {
    it("skips extraction for short conversations", async () => {
      const mockLLM = createMockLLM("");
      const extractor = new MemoryExtractor(mockLLM);

      const result = await extractor.extract({
        userId: "user-1",
        recentMessages: [{ role: "user", content: "Hello" }],
        existingProfiles: [],
        relatedMemories: [],
      });

      expect(result.skipReason).toBe("Conversation too short");
      expect(mockLLM.chat).not.toHaveBeenCalled();
    });

    it("parses valid JSON response", async () => {
      const jsonResponse = `\`\`\`json
{
  "profileUpdates": [
    { "key": "tone", "value": "casual", "confidence": 0.8 }
  ],
  "memoriesToUpsert": [
    {
      "kind": "knowledge",
      "title": "Project Name",
      "content": "Working on MirrorMate",
      "tags": ["project"],
      "importance": 0.7
    }
  ],
  "archiveCandidates": []
}
\`\`\``;

      const mockLLM = createMockLLM(jsonResponse);
      const extractor = new MemoryExtractor(mockLLM);

      const context: ConversationContext = {
        userId: "user-1",
        recentMessages: [
          { role: "user", content: "I'm working on MirrorMate project" },
          { role: "assistant", content: "That sounds interesting!" },
        ],
        existingProfiles: [],
        relatedMemories: [],
      };

      const result = await extractor.extract(context);

      expect(result.profileUpdates).toHaveLength(1);
      expect(result.profileUpdates[0].key).toBe("tone");
      expect(result.profileUpdates[0].confidence).toBe(0.8);

      expect(result.memoriesToUpsert).toHaveLength(1);
      expect(result.memoriesToUpsert[0].kind).toBe("knowledge");
      expect(result.memoriesToUpsert[0].title).toBe("Project Name");
    });

    it("handles JSON without code block", async () => {
      const jsonResponse = `{
  "profileUpdates": [],
  "memoriesToUpsert": [
    {
      "kind": "episode",
      "title": "Today's Plan",
      "content": "User has a meeting at 3pm",
      "tags": ["schedule"],
      "importance": 0.6
    }
  ],
  "archiveCandidates": []
}`;

      const mockLLM = createMockLLM(jsonResponse);
      const extractor = new MemoryExtractor(mockLLM);

      const result = await extractor.extract({
        userId: "user-1",
        recentMessages: [
          { role: "user", content: "I have a meeting at 3pm today" },
          { role: "assistant", content: "Got it!" },
        ],
        existingProfiles: [],
        relatedMemories: [],
      });

      expect(result.memoriesToUpsert).toHaveLength(1);
      expect(result.memoriesToUpsert[0].kind).toBe("episode");
    });

    it("handles invalid JSON gracefully", async () => {
      const mockLLM = createMockLLM("This is not valid JSON");
      const extractor = new MemoryExtractor(mockLLM);

      const result = await extractor.extract({
        userId: "user-1",
        recentMessages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi!" },
        ],
        existingProfiles: [],
        relatedMemories: [],
      });

      expect(result.profileUpdates).toHaveLength(0);
      expect(result.memoriesToUpsert).toHaveLength(0);
      expect(result.archiveCandidates).toHaveLength(0);
    });

    it("clamps confidence and importance values", async () => {
      const jsonResponse = `{
  "profileUpdates": [
    { "key": "test", "value": "value", "confidence": 1.5 }
  ],
  "memoriesToUpsert": [
    {
      "kind": "knowledge",
      "title": "Test",
      "content": "Content",
      "tags": [],
      "importance": -0.5
    }
  ],
  "archiveCandidates": []
}`;

      const mockLLM = createMockLLM(jsonResponse);
      const extractor = new MemoryExtractor(mockLLM);

      const result = await extractor.extract({
        userId: "user-1",
        recentMessages: [
          { role: "user", content: "Test" },
          { role: "assistant", content: "Test" },
        ],
        existingProfiles: [],
        relatedMemories: [],
      });

      expect(result.profileUpdates[0].confidence).toBe(1.0); // clamped to max
      expect(result.memoriesToUpsert[0].importance).toBe(0.0); // clamped to min
    });

    it("handles archive candidates with existingMemoryId", async () => {
      const jsonResponse = `{
  "profileUpdates": [],
  "memoriesToUpsert": [
    {
      "kind": "knowledge",
      "title": "Updated Info",
      "content": "New content",
      "tags": [],
      "importance": 0.7,
      "existingMemoryId": "memory-123"
    }
  ],
  "archiveCandidates": [
    { "memoryId": "old-memory-456", "reason": "Outdated information" }
  ]
}`;

      const mockLLM = createMockLLM(jsonResponse);
      const extractor = new MemoryExtractor(mockLLM);

      const result = await extractor.extract({
        userId: "user-1",
        recentMessages: [
          { role: "user", content: "Update the info" },
          { role: "assistant", content: "Updated!" },
        ],
        existingProfiles: [],
        relatedMemories: [
          { id: "memory-123", title: "Old Info", content: "Old content", kind: "knowledge" },
        ],
      });

      expect(result.memoriesToUpsert[0].existingMemoryId).toBe("memory-123");
      expect(result.archiveCandidates).toHaveLength(1);
      expect(result.archiveCandidates[0].memoryId).toBe("old-memory-456");
    });
  });
});
