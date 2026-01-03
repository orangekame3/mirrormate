import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { ConversationContext } from "./types";

/**
 * Memory extraction config structure
 */
interface MemoryExtractionConfig {
  memory: {
    extraction: {
      systemPrompt: string;
      labels: {
        user: string;
        assistant: string;
        conversationHistory: string;
        existingProfiles: string;
        relatedMemories: string;
        task: string;
      };
    };
  };
}

let cachedConfig: MemoryExtractionConfig | null = null;

/**
 * Default config (fallback)
 */
const defaultConfig: MemoryExtractionConfig = {
  memory: {
    extraction: {
      systemPrompt: `You are an expert at extracting important information from conversations.
Analyze the conversation between user and assistant, and output information to be stored as memories in JSON format.

## Output Format

Output in the following JSON format:

\`\`\`json
{
  "profileUpdates": [
    { "key": "profile key", "value": "value", "confidence": 0.0-1.0 }
  ],
  "memoriesToUpsert": [
    {
      "kind": "profile|episode|knowledge",
      "title": "brief title",
      "content": "detailed content",
      "tags": ["tag1", "tag2"],
      "importance": 0.0-1.0,
      "existingMemoryId": "existing ID if updating"
    }
  ],
  "archiveCandidates": [
    { "memoryId": "ID to archive", "reason": "reason" }
  ],
  "skipReason": "reason if nothing to extract"
}
\`\`\``,
      labels: {
        user: "User",
        assistant: "Assistant",
        conversationHistory: "## Conversation History",
        existingProfiles: "## Existing Profiles",
        relatedMemories: "## Related Memories",
        task: `## Task

Extract information worth remembering from the above conversation.
If it duplicates existing memory, specify existingMemoryId for update.
Add outdated information to archiveCandidates.

Output in JSON format.`,
      },
    },
  },
};

function getConfigPath(): string {
  return path.join(process.cwd(), "config", "memory.yaml");
}

function loadConfig(): MemoryExtractionConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    console.log("[Memory] Config file not found, using defaults");
    cachedConfig = defaultConfig;
    return cachedConfig;
  }

  try {
    const fileContents = fs.readFileSync(configPath, "utf8");
    cachedConfig = yaml.load(fileContents) as MemoryExtractionConfig;
    return cachedConfig;
  } catch (error) {
    console.error("[Memory] Failed to load config, using defaults:", error);
    cachedConfig = defaultConfig;
    return cachedConfig;
  }
}

/**
 * Get system prompt for memory extraction
 */
export function getExtractionSystemPrompt(): string {
  const config = loadConfig();
  return config.memory.extraction.systemPrompt;
}

/**
 * System prompt for memory extraction (for backward compatibility)
 */
export const EXTRACTION_SYSTEM_PROMPT = getExtractionSystemPrompt();

/**
 * Build user prompt for memory extraction
 */
export function buildExtractionPrompt(context: ConversationContext): string {
  const config = loadConfig();
  const labels = config.memory.extraction.labels;

  let prompt = `${labels.conversationHistory}\n\n`;

  for (const msg of context.recentMessages) {
    const role = msg.role === "user" ? labels.user : labels.assistant;
    prompt += `**${role}**: ${msg.content}\n\n`;
  }

  if (context.existingProfiles.length > 0) {
    prompt += `${labels.existingProfiles}\n\n`;
    for (const profile of context.existingProfiles) {
      prompt += `- ${profile.key}: ${profile.value}\n`;
    }
    prompt += "\n";
  }

  if (context.relatedMemories.length > 0) {
    prompt += `${labels.relatedMemories}\n\n`;
    for (const memory of context.relatedMemories) {
      prompt += `- [${memory.id}] (${memory.kind}) ${memory.title}: ${memory.content}\n`;
    }
    prompt += "\n";
  }

  prompt += labels.task;

  return prompt;
}

/**
 * Clear config cache
 */
export function clearMemoryPromptCache(): void {
  cachedConfig = null;
}
