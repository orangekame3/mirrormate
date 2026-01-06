import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { getLocale, type Locale } from "../app";

export interface WakeWordConfig {
  enabled: boolean;
  phrase: string;
  timeout: number;
}

export interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  recommendedVoice?: number;
  wakeWord?: WakeWordConfig;
  appearance: string[];
  personality: string[];
  speech_style: string[];
  examples: string[];
  behaviors?: string[];
  background: string;
}

export interface CharactersConfig {
  characters: CharacterPreset[];
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
let cachedLocale: Locale | null = null;
let cachedCharactersConfig: CharactersConfig | null = null;
let cachedCharactersLocale: Locale | null = null;
const cachedCharacterPrompts: Map<string, string> = new Map();

function getConfigPath(): string {
  const configDir = path.join(process.cwd(), "config");

  if (process.env.CHARACTER_CONFIG) {
    return path.join(configDir, process.env.CHARACTER_CONFIG);
  }

  // Use locale-specific config
  const locale = getLocale();
  const localePath = path.join(configDir, "locales", locale, "character.yaml");

  if (fs.existsSync(localePath)) {
    return localePath;
  }

  // Fallback to root config for backward compatibility
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
  const locale = getLocale();

  // Clear cache if locale changed
  if (cachedLocale !== locale) {
    cachedConfig = null;
    cachedPrompt = null;
    cachedLocale = locale;
  }

  if (cachedPrompt) {
    return cachedPrompt;
  }

  const config = loadCharacterConfig();
  const c = config.character;

  const isJapanese = locale === "ja";

  const sections = isJapanese
    ? [
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
      ]
    : [
        `You are ${c.description}.`,
        `Your name is "${c.name}". You have ${c.appearance.join(", ")}.`,
        "",
        "Personality:",
        ...c.personality.map((p) => `- ${p}`),
        "",
        "Speech style:",
        ...c.speech_style.map((s) => `- ${s}`),
        "",
        "Examples:",
        ...c.examples.map((e) => `- "${e}"`),
      ];

  // Add behaviors if defined
  if (c.behaviors && c.behaviors.length > 0) {
    sections.push("");
    sections.push(isJapanese ? "行動指針:" : "Behaviors:");
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
    phrase: "Hey Mira",
    timeout: 15,
  };

  return config.character.wakeWord ?? defaultConfig;
}

// Multi-character support functions

function getCharactersConfigPath(): string {
  const configDir = path.join(process.cwd(), "config");
  const locale = getLocale();
  const localePath = path.join(configDir, "locales", locale, "characters.yaml");

  if (fs.existsSync(localePath)) {
    return localePath;
  }

  // Fallback to ja if locale-specific doesn't exist
  const jaPath = path.join(configDir, "locales", "ja", "characters.yaml");
  if (fs.existsSync(jaPath)) {
    return jaPath;
  }

  return "";
}

const defaultCharactersConfig: CharactersConfig = {
  characters: [
    {
      id: "mira",
      name: "Mira",
      description: "a friendly mirror assistant",
      appearance: ["simple and friendly face", "warm glowing presence"],
      personality: ["helpful and kind", "curious and attentive"],
      speech_style: ["speaks in a friendly, casual tone", "keeps responses brief"],
      examples: ["Good morning! How can I help you today?"],
      background: "You are a helpful assistant living in the mirror.",
    },
  ],
};

export function loadCharactersConfig(): CharactersConfig {
  const locale = getLocale();

  if (cachedCharactersConfig && cachedCharactersLocale === locale) {
    return cachedCharactersConfig;
  }

  const configPath = getCharactersConfigPath();
  console.log(`[Characters] Loading config from: ${configPath}`);

  if (!configPath || !fs.existsSync(configPath)) {
    console.log("[Characters] Config file not found, using defaults");
    cachedCharactersConfig = defaultCharactersConfig;
    cachedCharactersLocale = locale;
    return cachedCharactersConfig;
  }

  const fileContents = fs.readFileSync(configPath, "utf8");
  cachedCharactersConfig = yaml.load(fileContents) as CharactersConfig;
  cachedCharactersLocale = locale;

  return cachedCharactersConfig;
}

export function getCharacterPresets(): CharacterPreset[] {
  const config = loadCharactersConfig();
  return config.characters;
}

export function getCharacterById(id: string): CharacterPreset | null {
  const config = loadCharactersConfig();
  return config.characters.find((c) => c.id === id) ?? null;
}

export function getSystemPromptForCharacter(characterId: string): string {
  const locale = getLocale();
  const cacheKey = `${locale}:${characterId}`;

  if (cachedCharacterPrompts.has(cacheKey)) {
    return cachedCharacterPrompts.get(cacheKey)!;
  }

  const character = getCharacterById(characterId);
  if (!character) {
    // Fall back to default character prompt
    return getSystemPrompt();
  }

  const isJapanese = locale === "ja";

  const sections = isJapanese
    ? [
        `あなたは${character.description}です。`,
        `名前は「${character.name}」。${character.appearance.join("、")}をしています。`,
        "",
        "性格:",
        ...character.personality.map((p) => `- ${p}`),
        "",
        "話し方:",
        ...character.speech_style.map((s) => `- ${s}`),
        "",
        "例:",
        ...character.examples.map((e) => `- 「${e}」`),
      ]
    : [
        `You are ${character.description}.`,
        `Your name is "${character.name}". You have ${character.appearance.join(", ")}.`,
        "",
        "Personality:",
        ...character.personality.map((p) => `- ${p}`),
        "",
        "Speech style:",
        ...character.speech_style.map((s) => `- ${s}`),
        "",
        "Examples:",
        ...character.examples.map((e) => `- "${e}"`),
      ];

  if (character.behaviors && character.behaviors.length > 0) {
    sections.push("");
    sections.push(isJapanese ? "行動指針:" : "Behaviors:");
    sections.push(...character.behaviors.map((b) => `- ${b}`));
  }

  sections.push("");
  sections.push(character.background.trim());

  const prompt = sections.join("\n");
  cachedCharacterPrompts.set(cacheKey, prompt);
  return prompt;
}

export function clearCharactersCache(): void {
  cachedCharactersConfig = null;
  cachedCharactersLocale = null;
  cachedCharacterPrompts.clear();
}
