export interface Plugin {
  name: string;
  getContext(): Promise<string>;
}

export interface PluginConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
}

export interface WeatherPluginConfig extends PluginConfig {
  provider: string;
  locations: Location[];
  defaultLocation: string;
}

export interface PluginsConfig {
  plugins: {
    weather?: WeatherPluginConfig;
    [key: string]: PluginConfig | undefined;
  };
}
