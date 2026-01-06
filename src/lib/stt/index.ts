/**
 * Speech-to-Text (STT) Module
 * Re-exports all STT-related types and providers
 */

// Types
export type {
  STTProvider,
  TranscribeOptions,
  TranscribeResult,
  OpenAIWhisperConfig,
  LocalWhisperConfig,
  WebSpeechConfig,
  SilenceDetectionConfig,
  STTConfig,
  STTClientConfig,
} from "./types";

export { DEFAULT_SILENCE_CONFIG } from "./types";

// Providers
export { OpenAIWhisperProvider } from "./openai-whisper";
export { LocalWhisperProvider } from "./local-whisper";
