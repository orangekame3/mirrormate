/**
 * Embedding provider interface
 */
export interface EmbeddingProvider {
  /**
   * Convert text to embedding vector
   */
  embed(text: string): Promise<EmbeddingResult>;

  /**
   * Embed multiple texts in batch
   */
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;

  /**
   * Get model name
   */
  getModelName(): string;

  /**
   * Get dimensions
   */
  getDimensions(): number;
}

/**
 * Embedding result
 */
export interface EmbeddingResult {
  /** Embedding vector */
  vector: number[];
  /** Model used */
  model: string;
  /** Dimensions */
  dims: number;
}

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  provider: "ollama";
  ollama?: OllamaEmbeddingConfig;
}

export interface OllamaEmbeddingConfig {
  model?: string;
  baseUrl?: string;
}
