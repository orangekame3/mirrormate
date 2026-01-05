import dns from "dns";
import { LLMProvider, ChatCompletionOptions, ChatCompletionResult, ChatMessage, StreamChunk } from "./types";
import { ToolCall } from "../tools/types";

// Force IPv4 first to avoid ETIMEDOUT on some networks
dns.setDefaultResultOrder("ipv4first");

export interface OllamaConfig {
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
    tool_calls?: OllamaToolCall[];
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

  private convertMessages(messages: ChatMessage[]): Record<string, unknown>[] {
    return messages.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "tool",
          content: msg.content,
        };
      }
      if (msg.role === "assistant" && msg.tool_calls) {
        return {
          role: "assistant",
          content: msg.content || "",
          tool_calls: msg.tool_calls.map((tc) => ({
            function: {
              name: tc.function.name,
              arguments: JSON.parse(tc.function.arguments),
            },
          })),
        };
      }
      return {
        role: msg.role,
        content: msg.content,
      };
    });
  }

  async chat(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    const requestBody: Record<string, unknown> = {
      model: this.model,
      messages: this.convertMessages(options.messages),
      stream: false,
      options: {
        num_predict: options.maxTokens || this.defaultMaxTokens,
        temperature: options.temperature || this.defaultTemperature,
      },
    };

    if (options.tools && options.tools.length > 0) {
      requestBody.tools = options.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Ollama] API error ${response.status}:`, errorText);
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    const message = data.message;

    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCalls: ToolCall[] = message.tool_calls.map((tc, index) => ({
        id: `call_${index}`,
        name: tc.function.name,
        arguments: tc.function.arguments,
      }));

      return {
        content: message.content || "",
        toolCalls,
        finishReason: "tool_calls",
      };
    }

    return {
      content: message?.content || "",
      finishReason: "stop",
    };
  }

  async *chatStream(options: ChatCompletionOptions): AsyncGenerator<StreamChunk> {
    const requestBody: Record<string, unknown> = {
      model: this.model,
      messages: this.convertMessages(options.messages),
      stream: true,
      options: {
        num_predict: options.maxTokens || this.defaultMaxTokens,
        temperature: options.temperature || this.defaultTemperature,
      },
    };

    // Note: Tool calling with streaming is not well supported in Ollama
    // If tools are provided, fall back to non-streaming
    if (options.tools && options.tools.length > 0) {
      const result = await this.chat(options);
      yield {
        content: result.content,
        done: true,
        toolCalls: result.toolCalls,
        finishReason: result.finishReason,
      };
      return;
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line) as OllamaChatResponse;

            if (data.message?.content) {
              yield {
                content: data.message.content,
                done: data.done,
                finishReason: data.done ? "stop" : undefined,
              };
            }

            if (data.done) {
              return;
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
