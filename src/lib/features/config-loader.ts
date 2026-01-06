import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { FeaturesConfig } from "./types";
import { getTimePreset, getWeatherPreset } from "../presets";

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
  const config = yaml.load(fileContents) as FeaturesConfig;

  // Apply locale presets
  const timePreset = getTimePreset();
  const weatherPreset = getWeatherPreset();

  // Merge time settings from preset (preset takes precedence if not explicitly set)
  if (config.features.time) {
    config.features.time.timezone = config.features.time.timezone || timePreset.timezone;
  }

  // Merge weather settings from preset
  if (config.features.weather) {
    if (!config.features.weather.locations || config.features.weather.locations.length === 0) {
      config.features.weather.locations = weatherPreset.locations;
    }
    config.features.weather.defaultLocation = config.features.weather.defaultLocation || weatherPreset.defaultLocation;
  }

  cachedConfig = config;
  return cachedConfig;
}

export function clearFeaturesConfigCache(): void {
  cachedConfig = null;
}
