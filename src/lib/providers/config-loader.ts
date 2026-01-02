import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { ProvidersConfig } from "./types";

let cachedConfig: ProvidersConfig | null = null;

function getConfigPath(): string {
  const configDir = path.join(process.cwd(), "config");

  if (process.env.PROVIDERS_CONFIG) {
    return path.join(configDir, process.env.PROVIDERS_CONFIG);
  }

  if (process.env.NODE_ENV === "production") {
    const dockerConfig = path.join(configDir, "providers.docker.yaml");
    if (fs.existsSync(dockerConfig)) {
      return dockerConfig;
    }
  }

  return path.join(configDir, "providers.yaml");
}

const defaultConfig: ProvidersConfig = {
  providers: {
    llm: {
      enabled: true,
      provider: "openai",
      openai: {
        model: "gpt-4o-mini",
        maxTokens: 300,
        temperature: 0.7,
      },
    },
    tts: {
      enabled: true,
      provider: "openai",
      openai: {
        voice: "shimmer",
        model: "tts-1",
        speed: 0.95,
      },
    },
  },
};

export function loadProvidersConfig(): ProvidersConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = getConfigPath();
  console.log(`[Providers] Loading config from: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    console.log("[Providers] Config file not found, using defaults (OpenAI)");
    cachedConfig = defaultConfig;
    return cachedConfig;
  }

  const fileContents = fs.readFileSync(configPath, "utf8");
  cachedConfig = yaml.load(fileContents) as ProvidersConfig;

  // Allow environment variable override for LLM provider
  if (process.env.LLM_PROVIDER && cachedConfig.providers?.llm) {
    cachedConfig.providers.llm.provider = process.env.LLM_PROVIDER as "openai" | "ollama";
    console.log(`[Providers] LLM provider overridden by env: ${process.env.LLM_PROVIDER}`);
  }

  return cachedConfig;
}

export function clearProvidersConfigCache(): void {
  cachedConfig = null;
}
