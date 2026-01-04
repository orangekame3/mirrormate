import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

export interface WakeWordConfig {
  enabled: boolean;
  phrase: string;
  timeout: number;
}

export interface CharacterConfig {
  character: {
    name: string;
    description: string;
    wakeWord?: WakeWordConfig;
    appearance: string[];
    personality: string[];
    speech_style: string[];
    examples: string[];
    behaviors?: string[];
    background: string;
  };
}

let cachedConfig: CharacterConfig | null = null;
let cachedPrompt: string | null = null;

function getConfigPath(): string {
  const configDir = path.join(process.cwd(), "config");

  if (process.env.CHARACTER_CONFIG) {
    return path.join(configDir, process.env.CHARACTER_CONFIG);
  }

  return path.join(configDir, "character.yaml");
}

const defaultConfig: CharacterConfig = {
  character: {
    name: "Mira",
    description: "a friendly mirror assistant",
    appearance: ["simple and friendly face", "warm glowing presence"],
    personality: [
      "helpful and kind",
      "curious and attentive",
      "always ready to assist",
    ],
    speech_style: [
      "speaks in a friendly, casual tone",
      "keeps responses brief and clear",
      "uses simple, easy-to-understand language",
    ],
    examples: [
      "Good morning! How can I help you today?",
      "Sure, let me check that for you!",
      "Is there anything else you'd like to know?",
    ],
    background:
      "You are a helpful assistant living in the mirror, always watching over and ready to help.",
  },
};

export function loadCharacterConfig(): CharacterConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = getConfigPath();
  console.log(`[Character] Loading config from: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    console.log("[Character] Config file not found, using defaults");
    cachedConfig = defaultConfig;
    return cachedConfig;
  }

  const fileContents = fs.readFileSync(configPath, "utf8");
  cachedConfig = yaml.load(fileContents) as CharacterConfig;

  return cachedConfig;
}

export function getSystemPrompt(): string {
  if (cachedPrompt) {
    return cachedPrompt;
  }

  const config = loadCharacterConfig();
  const c = config.character;

  const sections = [
    `あなたは${c.description}です。`,
    `名前は「${c.name}」。${c.appearance.join("、")}をしています。`,
    "",
    "性格:",
    ...c.personality.map((p) => `- ${p}`),
    "",
    "話し方:",
    ...c.speech_style.map((s) => `- ${s}`),
    "",
    "例:",
    ...c.examples.map((e) => `- 「${e}」`),
  ];

  // Add behaviors if defined
  if (c.behaviors && c.behaviors.length > 0) {
    sections.push("");
    sections.push("行動指針:");
    sections.push(...c.behaviors.map((b) => `- ${b}`));
  }

  sections.push("");
  sections.push(c.background.trim());

  cachedPrompt = sections.join("\n");
  return cachedPrompt;
}

export function clearCharacterCache(): void {
  cachedConfig = null;
  cachedPrompt = null;
}

export function getWakeWordConfig(): WakeWordConfig {
  const config = loadCharacterConfig();
  const defaultConfig: WakeWordConfig = {
    enabled: false,
    phrase: "OK ミラー",
    timeout: 15,
  };

  return config.character.wakeWord ?? defaultConfig;
}
