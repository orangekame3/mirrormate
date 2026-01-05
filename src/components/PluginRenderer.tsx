"use client";

import { useState, useEffect } from "react";
import { PluginLayout } from "./PluginContainer";
import { PluginsByPosition, PluginPosition } from "@/lib/plugins/types";

// Static imports for plugins
import { ClockWidget } from "mirrormate-clock-plugin";
import { VisionCompanion } from "@plugins/vision-companion/src";

// Map of plugin names to their components
const pluginComponents: Record<string, React.ComponentType<{ config?: Record<string, unknown> }>> = {
  clock: ClockWidget,
  "vision-companion": VisionCompanion,
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

  // Render hidden plugins (invisible but functional)
  const renderHiddenPlugins = () => {
    const hiddenPlugins = plugins["hidden"] || [];
    return hiddenPlugins.map((pluginInfo) => {
      const Component = pluginComponents[pluginInfo.manifest.name];
      if (!Component) {
        return null;
      }
      const config = {
        ...pluginInfo.manifest.defaultConfig,
        ...pluginInfo.config.config,
      };
      return <Component key={pluginInfo.pluginId} config={config} />;
    });
  };

  return (
    <>
      {renderHiddenPlugins()}
      <PluginLayout
        topLeft={<>{renderPluginsForPosition("top-left")}</>}
        topRight={<>{renderPluginsForPosition("top-right")}</>}
        bottomLeft={<>{renderPluginsForPosition("bottom-left")}</>}
        bottomRight={<>{renderPluginsForPosition("bottom-right")}</>}
      />
    </>
  );
}
