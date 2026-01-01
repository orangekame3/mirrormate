export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface ChatCompletionResult {
  content: string;
}

export interface LLMProvider {
  chat(options: ChatCompletionOptions): Promise<ChatCompletionResult>;
}
