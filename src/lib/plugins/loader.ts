import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { PluginManifest, PluginsConfig, PluginSource } from "./types";

// Cache for loaded plugin manifests
const manifestCache: Map<string, PluginManifest> = new Map();

// Cache for plugins config
let configCache: PluginsConfig | null = null;

/**
 * Get the plugins configuration file path
 */
function getConfigPath(): string {
  const configDir = path.join(process.cwd(), "config");

  if (process.env.PLUGINS_CONFIG) {
    return path.join(configDir, process.env.PLUGINS_CONFIG);
  }

  if (process.env.NODE_ENV === "production") {
    const dockerConfig = path.join(configDir, "plugins.docker.yaml");
    if (fs.existsSync(dockerConfig)) {
      return dockerConfig;
    }
  }

  return path.join(configDir, "plugins.yaml");
}

/**
 * Load plugins configuration from YAML
 */
export function loadPluginsConfig(): PluginsConfig {
  if (configCache) {
    return configCache;
  }

  const configPath = getConfigPath();
  console.log(`[Plugins] Loading config from: ${configPath}`);

  if (!fs.existsSync(configPath)) {
    console.log("[Plugins] Config file not found, using empty config");
    return { plugins: {} };
  }

  const fileContents = fs.readFileSync(configPath, "utf8");
  configCache = yaml.load(fileContents) as PluginsConfig;
  return configCache;
}

/**
 * Clear config cache
 */
export function clearPluginsConfigCache(): void {
  configCache = null;
  manifestCache.clear();
}

/**
 * Parse plugin source to get package name for node_modules lookup
 * - github:owner/repo -> repo name (e.g., mirrormate-clock-plugin)
 * - npm:package-name -> package-name
 * - local:plugin-name -> plugin-name
 */
export function parsePluginSource(source: PluginSource): {
  type: "github" | "npm" | "local";
  name: string;
  fullPath: string;
} {
  if (source.startsWith("github:")) {
    const repo = source.replace("github:", "");
    const repoName = repo.split("/")[1];
    return { type: "github", name: repoName, fullPath: repo };
  } else if (source.startsWith("npm:")) {
    const name = source.replace("npm:", "");
    return { type: "npm", name, fullPath: name };
  } else {
    const name = source.replace("local:", "");
    return { type: "local", name, fullPath: name };
  }
}

/**
 * Get configured plugins from plugins.yaml
 */
export function getConfiguredPlugins(): string[] {
  const config = loadPluginsConfig();
  const plugins: string[] = [];

  for (const [pluginName, pluginConfig] of Object.entries(config.plugins)) {
    if (pluginConfig.enabled && pluginConfig.source) {
      plugins.push(pluginName);
    }
  }

  console.log(`[Plugins] Configured: ${plugins.join(", ") || "(none)"}`);
  return plugins;
}

/**
 * Load a plugin manifest by plugin name (using source from config)
 */
export function loadPluginManifest(pluginName: string): PluginManifest | null {
  if (manifestCache.has(pluginName)) {
    return manifestCache.get(pluginName)!;
  }

  const config = loadPluginsConfig();
  const pluginConfig = config.plugins[pluginName];

  if (!pluginConfig?.source) {
    console.warn(`[Plugins] No source configured for plugin: ${pluginName}`);
    return null;
  }

  const { type, name } = parsePluginSource(pluginConfig.source);
  let manifest: PluginManifest | null = null;

  if (type === "local") {
    // Local plugin from plugins/ directory
    const manifestPath = path.join(
      process.cwd(),
      "plugins",
      name,
      "manifest.yaml"
    );
    if (fs.existsSync(manifestPath)) {
      manifest = yaml.load(
        fs.readFileSync(manifestPath, "utf8")
      ) as PluginManifest;
    }
  } else {
    // GitHub or npm package - both are installed in node_modules
    const pkgJsonPath = path.join(
      process.cwd(),
      "node_modules",
      name,
      "package.json"
    );
    if (fs.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
      manifest = pkgJson.mirrormate as PluginManifest;
    }
  }

  if (manifest) {
    manifestCache.set(pluginName, manifest);
  }

  return manifest;
}

/**
 * Get the npm package name from plugin source for import
 */
export function getPluginPackageName(source: PluginSource): string {
  const { type, name } = parsePluginSource(source);

  if (type === "local") {
    return `@plugins/${name}`;
  } else {
    // Both github: and npm: packages are in node_modules with the repo/package name
    return name;
  }
}
