"use client";

import { useState, useEffect } from "react";
import { PluginLayout } from "./PluginContainer";
import { PluginsByPosition, PluginPosition } from "@/lib/plugins/types";

// Static imports for plugins
import { ClockWidget } from "mirrormate-clock-plugin";

// Map of plugin names to their components
const pluginComponents: Record<string, React.ComponentType<{ config?: Record<string, unknown> }>> = {
  clock: ClockWidget,
};

interface PluginsApiResponse {
  plugins: PluginsByPosition;
}

export default function PluginRenderer() {
  const [plugins, setPlugins] = useState<PluginsByPosition | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPlugins() {
      try {
        const res = await fetch("/api/plugins");
        if (res.ok) {
          const data: PluginsApiResponse = await res.json();
          setPlugins(data.plugins);
        }
      } catch (error) {
        console.error("[PluginRenderer] Failed to load plugins:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPlugins();
  }, []);

  if (isLoading || !plugins) {
    return null;
  }

  // Render plugins for each position
  const renderPluginsForPosition = (position: PluginPosition) => {
    const positionPlugins = plugins[position] || [];

    return positionPlugins.map((pluginInfo) => {
      const Component = pluginComponents[pluginInfo.manifest.name];
      if (!Component) {
        console.warn(`[PluginRenderer] Unknown plugin: ${pluginInfo.manifest.name}`);
        return null;
      }

      // Merge default config with instance config
      const config = {
        ...pluginInfo.manifest.defaultConfig,
        ...pluginInfo.config.config,
      };

      return <Component key={pluginInfo.pluginId} config={config} />;
    });
  };

  return (
    <PluginLayout
      topLeft={<>{renderPluginsForPosition("top-left")}</>}
      topRight={<>{renderPluginsForPosition("top-right")}</>}
      bottomLeft={<>{renderPluginsForPosition("bottom-left")}</>}
      bottomRight={<>{renderPluginsForPosition("bottom-right")}</>}
    />
  );
}
