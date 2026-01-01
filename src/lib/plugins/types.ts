import { ComponentType } from "react";

// Position where plugin can be rendered
export type PluginPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

// Plugin metadata from manifest
export interface PluginManifest {
  name: string;
  displayName: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  defaultPosition: PluginPosition;
  defaultConfig?: Record<string, unknown>;
}

// Plugin component props passed by the system
export interface PluginProps<TConfig = Record<string, unknown>> {
  config: TConfig;
  position: PluginPosition;
}

// Runtime plugin instance
export interface Plugin<TConfig = Record<string, unknown>> {
  manifest: PluginManifest;
  Component: ComponentType<PluginProps<TConfig>>;
}

// Plugin source types
// - github:owner/repo - Install from GitHub repository
// - npm:package-name - Install from npm registry
// - local:plugin-name - Use from local plugins/ directory
export type PluginSource = `github:${string}` | `npm:${string}` | `local:${string}`;

// Plugin configuration from plugins.yaml
export interface PluginInstanceConfig {
  source: PluginSource;
  enabled: boolean;
  position?: PluginPosition;
  config?: Record<string, unknown>;
}

// Full plugins.yaml structure
export interface PluginsConfig {
  plugins: {
    [pluginName: string]: PluginInstanceConfig;
  };
}

// Clock plugin specific config
export interface ClockPluginConfig {
  timezone?: string;
  format24h?: boolean;
  showSeconds?: boolean;
  showDate?: boolean;
  dateFormat?: "short" | "long" | "full";
  showWeekday?: boolean;
  locale?: string;
}

// Plugin info for API response
export interface PluginInfo {
  manifest: PluginManifest;
  config: PluginInstanceConfig;
  pluginId: string;
}

// Plugins grouped by position
export type PluginsByPosition = Record<PluginPosition, PluginInfo[]>;
