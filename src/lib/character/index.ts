import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

export interface CharacterConfig {
  character: {
    name: string;
    description: string;
    appearance: string[];
    personality: string[];
    speech_style: string[];
    examples: string[];
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

export function loadCharacterConfig(): CharacterConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = getConfigPath();
  console.log(`[Character] Loading config from: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Character config not found: ${configPath}`);
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
    "",
    c.background.trim(),
  ];

  cachedPrompt = sections.join("\n");
  return cachedPrompt;
}

export function clearCharacterCache(): void {
  cachedConfig = null;
  cachedPrompt = null;
}
