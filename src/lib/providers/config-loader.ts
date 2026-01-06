import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { ProvidersConfig } from "./types";
import { getSTTPreset } from "../presets";

let cachedConfig: ProvidersConfig | null = null;

function getConfigPath(): string {
  const configDir = path.join(process.cwd(), "config");

  // Use PROVIDERS_CONFIG env var if set
  if (process.env.PROVIDERS_CONFIG) {
    return path.join(configDir, process.env.PROVIDERS_CONFIG);
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

  // Allow environment variable override for TTS provider
  if (process.env.TTS_PROVIDER && cachedConfig.providers?.tts) {
    cachedConfig.providers.tts.provider = process.env.TTS_PROVIDER as "openai" | "voicevox";
    console.log(`[Providers] TTS provider overridden by env: ${process.env.TTS_PROVIDER}`);
  }

  // Allow environment variable override for STT provider
  if (process.env.STT_PROVIDER && cachedConfig.providers?.stt) {
    cachedConfig.providers.stt.provider = process.env.STT_PROVIDER as "openai" | "local" | "web";
    console.log(`[Providers] STT provider overridden by env: ${process.env.STT_PROVIDER}`);
  }

  // Apply locale preset to STT settings
  if (cachedConfig.providers?.stt) {
    const sttPreset = getSTTPreset();
    const stt = cachedConfig.providers.stt;

    // Apply preset language settings if not explicitly set
    if (stt.openai) {
      stt.openai.language = stt.openai.language || sttPreset.language;
    }
    if (stt.local) {
      stt.local.language = stt.local.language || sttPreset.language;
    }
    if (stt.web) {
      stt.web.language = stt.web.language || sttPreset.webLanguage;
    }
  }

  return cachedConfig;
}

export function clearProvidersConfigCache(): void {
  cachedConfig = null;
}
