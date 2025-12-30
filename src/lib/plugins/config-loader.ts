import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { PluginsConfig } from "./types";

let cachedConfig: PluginsConfig | null = null;

export function loadPluginsConfig(): PluginsConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(process.cwd(), "config", "plugins.yaml");

  if (!fs.existsSync(configPath)) {
    return { plugins: {} };
  }

  const fileContents = fs.readFileSync(configPath, "utf8");
  cachedConfig = yaml.load(fileContents) as PluginsConfig;

  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
