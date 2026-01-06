import { VLMProvider, VLMConfig } from "./types";
import { OllamaVLMProvider } from "./ollama-vlm";
import { loadProvidersConfig } from "../providers/config-loader";

export * from "./types";
export { OllamaVLMProvider } from "./ollama-vlm";

let vlmProvider: VLMProvider | null = null;

export function getVLMProvider(): VLMProvider | null {
  if (vlmProvider) {
    return vlmProvider;
  }

  const config = loadProvidersConfig();
  const vlmConfig = config.providers?.vlm as VLMConfig | undefined;

  if (!vlmConfig?.enabled) {
    console.log("[VLM] VLM provider is disabled");
    return null;
  }

  if (vlmConfig.provider === "ollama") {
    vlmProvider = new OllamaVLMProvider(vlmConfig.ollama);
    console.log("[VLM] Initialized Ollama VLM provider");
    return vlmProvider;
  }

  console.warn(`[VLM] Unknown provider: ${vlmConfig.provider}`);
  return null;
}

export function clearVLMProviderCache(): void {
  vlmProvider = null;
}
