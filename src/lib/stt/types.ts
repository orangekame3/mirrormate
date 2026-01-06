/**
 * Speech-to-Text (STT) Provider Types
 */

/**
 * STT Provider interface - all STT implementations must implement this
 */
export interface STTProvider {
  /**
   * Transcribe audio to text
   * @param audio - Audio data as Buffer
   * @param options - Transcription options
   */
  transcribe(audio: Buffer, options?: TranscribeOptions): Promise<TranscribeResult>;

  /**
   * Get provider name for logging/debugging
   */
  getProviderName(): string;

  /**
   * Get list of supported audio formats
   */
  getSupportedFormats(): string[];
}

/**
 * Options for transcription
 */
export interface TranscribeOptions {
  /** Language code (ISO 639-1, e.g., "ja", "en") */
  language?: string;
  /** Response format */
  responseFormat?: "json" | "text" | "verbose_json";
  /** Prompt to guide transcription style */
  prompt?: string;
  /** Temperature for sampling (0-1, lower = more deterministic) */
  temperature?: number;
}

/**
 * Result from transcription
 */
export interface TranscribeResult {
  /** Transcribed text */
  transcript: string;
  /** Detected language (if available) */
  language?: string;
  /** Confidence score (0-1, if available) */
  confidence?: number;
  /** Duration of audio in seconds (if available) */
  duration?: number;
}

/**
 * OpenAI Whisper specific configuration
 */
export interface OpenAIWhisperConfig {
  /** Model to use (currently only whisper-1) */
  model?: "whisper-1";
  /** Language code for transcription */
  language?: string;
  /** Prompt to guide transcription */
  prompt?: string;
  /** Temperature for sampling */
  temperature?: number;
}

/**
 * Local Whisper (faster-whisper, etc.) configuration
 */
export interface LocalWhisperConfig {
  /** Base URL of local Whisper server */
  baseUrl?: string;
  /** Model to use (tiny, base, small, medium, large) */
  model?: string;
  /** Language code for transcription */
  language?: string;
}

/**
 * Web Speech API configuration (client-side only)
 */
export interface WebSpeechConfig {
  /** Language code (BCP 47, e.g., "ja-JP", "en-US") */
  language?: string;
}

/**
 * Silence detection configuration
 */
export interface SilenceDetectionConfig {
  /** Duration of silence before stopping recording (seconds) */
  silenceThreshold: number;
  /** Volume threshold below which is considered silence (RMS, 0-1) */
  volumeThreshold: number;
  /** Minimum recording duration before silence detection kicks in (ms) */
  minRecordingDuration: number;
  /** Maximum recording duration before auto-stop (ms) */
  maxRecordingDuration: number;
}

/**
 * Default silence detection settings
 */
export const DEFAULT_SILENCE_CONFIG: SilenceDetectionConfig = {
  silenceThreshold: 1.5,
  volumeThreshold: 0.02,
  minRecordingDuration: 500,
  maxRecordingDuration: 60000,
};

/**
 * Full STT configuration
 */
export interface STTConfig {
  /** Whether STT is enabled */
  enabled: boolean;
  /** Which provider to use */
  provider: "openai" | "local" | "web";
  /** OpenAI Whisper settings */
  openai?: OpenAIWhisperConfig;
  /** Local Whisper settings */
  local?: LocalWhisperConfig;
  /** Web Speech API settings */
  web?: WebSpeechConfig;
  /** Silence detection settings */
  silenceDetection?: Partial<SilenceDetectionConfig>;
}

/**
 * Client-safe STT configuration (no sensitive data)
 */
export interface STTClientConfig {
  enabled: boolean;
  provider: string;
  silenceDetection: SilenceDetectionConfig;
  language: string;
}
