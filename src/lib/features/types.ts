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

export interface FeaturesConfig {
  features: {
    weather?: WeatherFeatureConfig;
    calendar?: CalendarFeatureConfig;
    time?: TimeFeatureConfig;
    reminder?: ReminderFeatureConfig;
    [key: string]: FeatureConfig | undefined;
  };
}
