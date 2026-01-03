import { loadProvidersConfig } from "./config-loader";
import { EmbeddingProvider, OllamaEmbeddingProvider } from "../embedding";

let cachedProvider: EmbeddingProvider | null = null;

/**
 * Get embedding provider
 * Returns null if disabled in configuration
 */
export function getEmbeddingProvider(): EmbeddingProvider | null {
  if (cachedProvider) {
    return cachedProvider;
  }

  const config = loadProvidersConfig();
  const embeddingConfig = config.providers?.embedding;

  if (!embeddingConfig?.enabled) {
    console.log("[Providers] Embedding is disabled");
    return null;
  }

  if (embeddingConfig.provider === "ollama") {
    const ollamaConfig = embeddingConfig.ollama || {};
    cachedProvider = new OllamaEmbeddingProvider({
      model: ollamaConfig.model,
      baseUrl: ollamaConfig.baseUrl,
    });
    console.log(`[Providers] Using Ollama embedding: ${ollamaConfig.model || "bge-m3"}`);
  } else {
    console.log(`[Providers] Unknown embedding provider: ${embeddingConfig.provider}`);
    return null;
  }

  return cachedProvider;
}

/**
 * Clear cache
 */
export function clearEmbeddingProviderCache(): void {
  cachedProvider = null;
}
