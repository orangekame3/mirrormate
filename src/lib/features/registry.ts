import { Feature } from "./types";
import { loadFeaturesConfig } from "./config-loader";
import { WeatherFeature } from "./weather";
import { CalendarFeature } from "./calendar";
import { TimeFeature } from "./time";

const features: Map<string, Feature> = new Map();
let initialized = false;

export function initializeFeatures(): void {
  if (initialized) {
    return;
  }

  const config = loadFeaturesConfig();

  if (config.features.weather?.enabled) {
    features.set("weather", new WeatherFeature(config.features.weather));
  }

  if (config.features.calendar?.enabled) {
    features.set("calendar", new CalendarFeature(config.features.calendar));
  }

  if (config.features.time?.enabled) {
    features.set("time", new TimeFeature(config.features.time));
  }

  initialized = true;
}

export async function getAllContexts(): Promise<string> {
  initializeFeatures();

  const contexts: string[] = [];

  for (const feature of features.values()) {
    const context = await feature.getContext();
    if (context) {
      contexts.push(context);
    }
  }

  return contexts.join("\n");
}

export function getFeature(name: string): Feature | undefined {
  initializeFeatures();
  return features.get(name);
}

export async function getFeatureContext(name: string): Promise<string> {
  const feature = getFeature(name);
  if (!feature) {
    return "";
  }
  return feature.getContext();
}
