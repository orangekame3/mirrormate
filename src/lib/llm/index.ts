import { LLMProviderConfig } from "../providers/types";
import { loadProvidersConfig } from "../providers/config-loader";
import { LLMProvider } from "./types";
import { OpenAIProvider } from "./openai";
import { OllamaProvider } from "./ollama";

export type { LLMProvider, ChatMessage, ChatCompletionOptions, ChatCompletionResult, StreamChunk } from "./types";

let cachedProvider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const config = loadProvidersConfig();
  const llmConfig: LLMProviderConfig = config.providers.llm || {
    enabled: true,
    provider: "openai",
  };

  const provider = llmConfig.provider || "openai";

  switch (provider) {
    case "ollama":
      console.log("[LLM] Using Ollama provider");
      cachedProvider = new OllamaProvider(llmConfig.ollama);
      break;
    case "openai":
    default:
      console.log("[LLM] Using OpenAI provider");
      cachedProvider = new OpenAIProvider(llmConfig.openai);
      break;
  }

  return cachedProvider;
}

export function resetLLMProvider(): void {
  cachedProvider = null;
}
