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

export function loadProvidersConfig(): ProvidersConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = getConfigPath();
  console.log(`[Providers] Loading config from: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    return { providers: {} };
  }

  const fileContents = fs.readFileSync(configPath, "utf8");
  cachedConfig = yaml.load(fileContents) as ProvidersConfig;

  return cachedConfig;
}

export function clearProvidersConfigCache(): void {
  cachedConfig = null;
}
