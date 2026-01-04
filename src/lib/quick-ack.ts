/**
 * Quick Acknowledgment Generator
 *
 * Generates immediate acknowledgment phrases based on user input patterns.
 * This provides instant feedback while the actual LLM response is being generated.
 */

interface AckPattern {
  patterns: RegExp[];
  responses: string[];
}

const ACK_PATTERNS: AckPattern[] = [
  // Search/lookup requests
  {
    patterns: [/調べ|検索|教えて|知りたい|何\?|なに\?/],
    responses: [
      "うん、調べてみるね！",
      "ちょっと調べるね！",
      "わかった、調べてみる！",
    ],
  },
  // Weather
  {
    patterns: [/天気|気温|雨|晴れ|曇り/],
    responses: [
      "天気ね！見てみるね！",
      "うん、天気調べるね！",
    ],
  },
  // Time/schedule
  {
    patterns: [/時間|予定|スケジュール|今日/],
    responses: [
      "うん、確認するね！",
      "ちょっと見てみるね！",
    ],
  },
  // Discord/sharing
  {
    patterns: [/Discord|ディスコード|送って|共有|スマホ/],
    responses: [
      "うん、送るね〜！",
      "わかった、送ってみる！",
    ],
  },
  // Greetings
  {
    patterns: [/おはよう|こんにちは|こんばんは|ただいま|おやすみ/],
    responses: [], // No ack needed for greetings, respond directly
  },
  // Simple questions (yes/no type)
  {
    patterns: [/^(うん|はい|いいえ|いや|そう|違う)/],
    responses: [], // No ack needed for simple responses
  },
];

// Default acknowledgments for unmatched patterns
const DEFAULT_RESPONSES = [
  "うんうん！",
  "なるほど！",
  "うん、ちょっと待ってね！",
];

/**
 * Generate a quick acknowledgment for the user's message.
 * Returns null if no acknowledgment is needed (e.g., for greetings).
 */
export function generateQuickAck(message: string): string | null {
  // Skip very short messages
  if (message.length < 3) {
    return null;
  }

  // Check each pattern
  for (const { patterns, responses } of ACK_PATTERNS) {
    const matches = patterns.some((p) => p.test(message));
    if (matches) {
      // Empty responses means no ack needed
      if (responses.length === 0) {
        return null;
      }
      // Return random response from matched pattern
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  // For longer messages that don't match patterns, use default ack
  if (message.length > 10) {
    return DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)];
  }

  return null;
}

/**
 * Extract the topic/subject from user message for echo-style acknowledgment.
 * Returns a phrase like "〇〇ね！" or null if extraction fails.
 */
export function extractTopicAck(message: string): string | null {
  // Try to extract key noun/topic
  // Pattern: Look for "〇〇を教えて" "〇〇について" "〇〇は？"
  const patterns = [
    /(.+?)(?:を|について|って|は[？\?]?$)/,
    /(.+?)(?:教えて|調べて|検索して)/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const topic = match[1].trim();
      if (topic.length > 1 && topic.length < 20) {
        const suffixes = ["ね！調べてみる！", "かな？ちょっと待ってね！", "ね！"];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        return `${topic}${suffix}`;
      }
    }
  }

  return null;
}

/**
 * Get the best acknowledgment for a message.
 * Tries topic extraction first, then pattern matching.
 */
export function getAcknowledgment(message: string): string | null {
  // First try topic-based echo
  const topicAck = extractTopicAck(message);
  if (topicAck) {
    return topicAck;
  }

  // Fall back to pattern-based acknowledgment
  return generateQuickAck(message);
}
