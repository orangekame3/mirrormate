import { loadProvidersConfig } from "./config-loader";
import { STTProviderConfig } from "./types";
import {
  STTProvider,
  STTClientConfig,
  DEFAULT_SILENCE_CONFIG,
  OpenAIWhisperProvider,
  LocalWhisperProvider,
} from "../stt";

let cachedProvider: STTProvider | null = null;

/**
 * Get STT provider based on configuration
 * Returns null if provider is "web" (handled client-side) or disabled
 */
export function getSTTProvider(): STTProvider | null {
  if (cachedProvider) {
    return cachedProvider;
  }

  const config = loadProvidersConfig();
  const sttConfig = config.providers?.stt;

  if (!sttConfig?.enabled) {
    console.log("[STT] STT is disabled");
    return null;
  }

  const provider = sttConfig.provider || "web";

  // "web" provider is handled client-side via Web Speech API
  if (provider === "web") {
    console.log("[STT] Using Web Speech API (client-side)");
    return null;
  }

  if (provider === "openai") {
    try {
      cachedProvider = new OpenAIWhisperProvider(sttConfig.openai || {});
      console.log("[STT] Using OpenAI Whisper");
      return cachedProvider;
    } catch (error) {
      console.error("[STT] Failed to initialize OpenAI Whisper:", error);
      return null;
    }
  }

  if (provider === "local") {
    try {
      cachedProvider = new LocalWhisperProvider(sttConfig.local || {});
      console.log(
        `[STT] Using Local Whisper at ${sttConfig.local?.baseUrl || "http://localhost:8080"}`
      );
      return cachedProvider;
    } catch (error) {
      console.error("[STT] Failed to initialize Local Whisper:", error);
      return null;
    }
  }

  console.warn(`[STT] Unknown provider: ${provider}, falling back to web`);
  return null;
}

/**
 * Get STT configuration for server-side use
 */
export function getSTTConfig(): STTProviderConfig {
  const config = loadProvidersConfig();
  return (
    config.providers?.stt || {
      enabled: false,
      provider: "web",
    }
  );
}

/**
 * Get client-safe STT configuration
 * Excludes sensitive information like API keys
 */
export function getSTTClientConfig(): STTClientConfig {
  const config = getSTTConfig();

  // Determine language based on provider
  let language = "en-US";
  if (config.provider === "openai" && config.openai?.language) {
    // Convert ISO 639-1 to BCP 47 for client
    language = config.openai.language === "ja" ? "ja-JP" : config.openai.language;
  } else if (config.provider === "local" && config.local?.language) {
    language = config.local.language === "ja" ? "ja-JP" : config.local.language;
  } else if (config.provider === "web" && config.web?.language) {
    language = config.web.language;
  }

  return {
    enabled: config.enabled ?? false,
    provider: config.provider || "web",
    silenceDetection: {
      ...DEFAULT_SILENCE_CONFIG,
      ...config.silenceDetection,
    },
    language,
  };
}

/**
 * Clear the cached STT provider
 * Useful for testing or when configuration changes
 */
export function clearSTTProviderCache(): void {
  cachedProvider = null;
}
