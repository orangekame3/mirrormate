import dns from "dns";
import { EmbeddingProvider, EmbeddingResult, OllamaEmbeddingConfig } from "./types";

// Force IPv4 first to avoid ETIMEDOUT on some networks
dns.setDefaultResultOrder("ipv4first");

interface OllamaEmbedResponse {
  model: string;
  embeddings: number[][];
}

/**
 * Ollama Embedding Provider
 *
 * Generates embeddings using Ollama's /api/embed endpoint
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private baseUrl: string;
  private model: string;
  private dims: number | null = null;

  constructor(config: OllamaEmbeddingConfig = {}) {
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.model = config.model || "bge-m3";
  }

  getModelName(): string {
    return this.model;
  }

  getDimensions(): number {
    if (this.dims === null) {
      throw new Error(
        "Embedding dimensions are not initialized. Dimensions are determined after the first successful embed() or embedBatch() call. Please call embed() (or embedBatch()) before accessing getDimensions()."
      );
    }
    return this.dims;
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama embed API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OllamaEmbedResponse;

    if (!data.embeddings || data.embeddings.length === 0) {
      throw new Error("No embeddings returned from Ollama");
    }

    const vector = data.embeddings[0];
    this.dims = vector.length;

    return {
      vector,
      model: this.model,
      dims: this.dims,
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    // Ollama's /api/embed supports array input
    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama embed API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OllamaEmbedResponse;

    if (!data.embeddings || data.embeddings.length === 0) {
      throw new Error("No embeddings returned from Ollama");
    }

    this.dims = data.embeddings[0].length;

    return data.embeddings.map((vector) => ({
      vector,
      model: this.model,
      dims: this.dims!,
    }));
  }
}
