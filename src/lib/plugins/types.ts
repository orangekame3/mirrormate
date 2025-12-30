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

export interface CalendarPluginConfig extends PluginConfig {
  maxResults: number;
}

export interface TimePluginConfig extends PluginConfig {
  timezone?: string;
}

export interface PluginsConfig {
  plugins: {
    weather?: WeatherPluginConfig;
    calendar?: CalendarPluginConfig;
    time?: TimePluginConfig;
    [key: string]: PluginConfig | undefined;
  };
}
