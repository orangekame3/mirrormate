import dns from "dns";
import { LLMProvider, ChatCompletionOptions, ChatCompletionResult } from "./types";

// Force IPv4 first to avoid ETIMEDOUT on some networks
dns.setDefaultResultOrder("ipv4first");

export interface OllamaConfig {
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl || "http://localhost:11434";
    this.model = config.model || "llama3.2";
    this.defaultMaxTokens = config.maxTokens || 300;
    this.defaultTemperature = config.temperature || 0.7;
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        stream: false,
        options: {
          num_predict: options.maxTokens || this.defaultMaxTokens,
          temperature: options.temperature || this.defaultTemperature,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    const content = data.message?.content || "";

    return { content };
  }
}
