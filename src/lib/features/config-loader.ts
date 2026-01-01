import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { FeaturesConfig } from "./types";

let cachedConfig: FeaturesConfig | null = null;

function getConfigPath(): string {
  const configDir = path.join(process.cwd(), "config");

  if (process.env.FEATURES_CONFIG) {
    return path.join(configDir, process.env.FEATURES_CONFIG);
  }

  if (process.env.NODE_ENV === "production") {
    const dockerConfig = path.join(configDir, "features.docker.yaml");
    if (fs.existsSync(dockerConfig)) {
      return dockerConfig;
    }
  }

  return path.join(configDir, "features.yaml");
}

export function loadFeaturesConfig(): FeaturesConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = getConfigPath();
  console.log(`[Features] Loading config from: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    return { features: {} };
  }

  const fileContents = fs.readFileSync(configPath, "utf8");
  cachedConfig = yaml.load(fileContents) as FeaturesConfig;

  return cachedConfig;
}

export function clearFeaturesConfigCache(): void {
  cachedConfig = null;
}
