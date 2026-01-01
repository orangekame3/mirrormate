import OpenAI from "openai";
import { LLMProvider, ChatCompletionOptions, ChatCompletionResult } from "./types";

export interface OpenAIConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  constructor(config: OpenAIConfig = {}) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.model = config.model || "gpt-4o-mini";
    this.defaultMaxTokens = config.maxTokens || 300;
    this.defaultTemperature = config.temperature || 0.7;
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: options.messages,
      max_tokens: options.maxTokens || this.defaultMaxTokens,
      temperature: options.temperature || this.defaultTemperature,
    });

    const content = completion.choices[0]?.message?.content || "";

    return { content };
  }
}
