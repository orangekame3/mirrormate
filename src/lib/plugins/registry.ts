import { Plugin } from "./types";
import { loadPluginsConfig } from "./config-loader";
import { WeatherPlugin } from "./weather";

const plugins: Map<string, Plugin> = new Map();
let initialized = false;

export function initializePlugins(): void {
  if (initialized) {
    return;
  }

  const config = loadPluginsConfig();

  if (config.plugins.weather?.enabled) {
    plugins.set("weather", new WeatherPlugin(config.plugins.weather));
  }

  initialized = true;
}

export async function getAllContexts(): Promise<string> {
  initializePlugins();

  const contexts: string[] = [];

  for (const plugin of plugins.values()) {
    const context = await plugin.getContext();
    if (context) {
      contexts.push(context);
    }
  }

  return contexts.join("\n");
}

export function getPlugin(name: string): Plugin | undefined {
  initializePlugins();
  return plugins.get(name);
}
