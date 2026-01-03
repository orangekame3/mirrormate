export interface ProviderConfig {
  enabled: boolean;
  provider: string;
  [key: string]: unknown;
}

export interface TTSProviderConfig extends ProviderConfig {
  provider: "openai" | "voicevox";
  openai?: {
    voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
    model?: "tts-1" | "tts-1-hd";
    speed?: number;
  };
  voicevox?: {
    speaker: number;
    baseUrl?: string;
  };
}

export interface LLMProviderConfig extends ProviderConfig {
  provider: "openai" | "ollama";
  openai?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  };
  ollama?: {
    model?: string;
    baseUrl?: string;
    maxTokens?: number;
    temperature?: number;
  };
}

export interface EmbeddingProviderConfig extends ProviderConfig {
  provider: "ollama";
  ollama?: {
    model?: string;
    baseUrl?: string;
  };
}

export interface MemoryConfig {
  enabled: boolean;
  rag?: {
    topK?: number;
    threshold?: number;
  };
  extraction?: {
    autoExtract?: boolean;
    minConfidence?: number;
  };
}

export interface ProvidersConfig {
  providers: {
    llm?: LLMProviderConfig;
    tts?: TTSProviderConfig;
    embedding?: EmbeddingProviderConfig;
    memory?: MemoryConfig;
    [key: string]: ProviderConfig | MemoryConfig | undefined;
  };
}
