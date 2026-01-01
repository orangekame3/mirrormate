import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { PluginsConfig } from "./types";

let cachedConfig: PluginsConfig | null = null;

function getConfigPath(): string {
  const configDir = path.join(process.cwd(), "config");

  // Check for explicit config file via environment variable
  if (process.env.PLUGINS_CONFIG) {
    return path.join(configDir, process.env.PLUGINS_CONFIG);
  }

  // Use docker config in production if it exists
  if (process.env.NODE_ENV === "production") {
    const dockerConfig = path.join(configDir, "plugins.docker.yaml");
    if (fs.existsSync(dockerConfig)) {
      return dockerConfig;
    }
  }

  return path.join(configDir, "plugins.yaml");
}

export function loadPluginsConfig(): PluginsConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = getConfigPath();
  console.log(`[Config] Loading config from: ${configPath}`);

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
