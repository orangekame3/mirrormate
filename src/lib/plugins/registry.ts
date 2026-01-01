import {
  PluginManifest,
  PluginInstanceConfig,
  PluginInfo,
  PluginsByPosition,
} from "./types";
import { loadPluginsConfig, getConfiguredPlugins, loadPluginManifest } from "./loader";

// Cached enabled plugins by position
let enabledPluginsCache: PluginsByPosition | null = null;

/**
 * Get all enabled plugins grouped by position
 */
export function getEnabledPluginsByPosition(): PluginsByPosition {
  if (enabledPluginsCache) {
    return enabledPluginsCache;
  }

  const config = loadPluginsConfig();
  const configuredPlugins = getConfiguredPlugins();

  const byPosition: PluginsByPosition = {
    "top-left": [],
    "top-right": [],
    "bottom-left": [],
    "bottom-right": [],
  };

  // Process each configured plugin
  for (const pluginName of configuredPlugins) {
    const instanceConfig = config.plugins[pluginName];
    if (!instanceConfig?.enabled) continue;

    const manifest = loadPluginManifest(pluginName);
    if (!manifest) {
      console.warn(`[Plugins] Could not load manifest for: ${pluginName}`);
      continue;
    }

    // Determine position
    const position = instanceConfig.position || manifest.defaultPosition;

    byPosition[position].push({
      manifest,
      config: instanceConfig,
      pluginId: pluginName,
    });
  }

  enabledPluginsCache = byPosition;
  return byPosition;
}

/**
 * Clear all caches (for hot reload)
 */
export function clearPluginCache(): void {
  enabledPluginsCache = null;
}

/**
 * Get list of all configured plugins (for admin UI)
 */
export function getAvailablePlugins(): Array<{
  pluginId: string;
  manifest: PluginManifest;
  enabled: boolean;
  config: PluginInstanceConfig;
}> {
  const config = loadPluginsConfig();
  const plugins: Array<{
    pluginId: string;
    manifest: PluginManifest;
    enabled: boolean;
    config: PluginInstanceConfig;
  }> = [];

  for (const [pluginName, instanceConfig] of Object.entries(config.plugins)) {
    const manifest = loadPluginManifest(pluginName);
    if (manifest) {
      plugins.push({
        pluginId: pluginName,
        manifest,
        enabled: instanceConfig.enabled,
        config: instanceConfig,
      });
    }
  }

  return plugins;
}

/**
 * Get a specific plugin info by name
 */
export function getPluginInfo(name: string): PluginInfo | null {
  const config = loadPluginsConfig();
  const instanceConfig = config.plugins[name];

  if (!instanceConfig) {
    return null;
  }

  const manifest = loadPluginManifest(name);
  if (!manifest) {
    return null;
  }

  return {
    manifest,
    config: instanceConfig,
    pluginId: name,
  };
}
