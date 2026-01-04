export interface Feature {
  name: string;
  getContext(): Promise<string>;
}

export interface FeatureConfig {
  enabled: boolean;
  [key: string]: unknown;
}

export interface Location {
  name: string;
  latitude: number;
  longitude: number;
}

export interface WeatherFeatureConfig extends FeatureConfig {
  provider: string;
  locations: Location[];
  defaultLocation: string;
}

export interface CalendarFeatureConfig extends FeatureConfig {
  maxResults: number;
}

export interface TimeFeatureConfig extends FeatureConfig {
  timezone?: string;
}

export interface ReminderConfig {
  minutes: number;
  urgent?: boolean;
}

export interface ReminderFeatureConfig extends FeatureConfig {
  pollingInterval: number; // in seconds
  reminders: ReminderConfig[];
}

export interface DiscordFeatureConfig extends FeatureConfig {
  webhookUrl?: string; // Can also be set via DISCORD_WEBHOOK_URL env var
  autoShare?: {
    searchResults?: boolean;
    weather?: boolean;
    calendar?: boolean;
  };
}

export interface FeaturesConfig {
  features: {
    weather?: WeatherFeatureConfig;
    calendar?: CalendarFeatureConfig;
    time?: TimeFeatureConfig;
    reminder?: ReminderFeatureConfig;
    discord?: DiscordFeatureConfig;
    [key: string]: FeatureConfig | undefined;
  };
}
