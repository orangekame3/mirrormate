export interface VLMProvider {
  analyzeImage(image: string, prompt: string): Promise<string>;
  checkWaving(image: string): Promise<WavingResult>;
}

export interface WavingResult {
  waving: boolean;
  confidence: number;
  reason: string;
  rawResponse?: string;
}

export interface OllamaVLMConfig {
  model?: string;
  baseUrl?: string;
}

export interface VLMConfig {
  enabled: boolean;
  provider: "ollama";
  ollama?: OllamaVLMConfig;
}
