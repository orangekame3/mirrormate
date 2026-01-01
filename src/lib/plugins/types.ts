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

export interface ReminderConfig {
  minutes: number;
  urgent?: boolean;
}

export interface ReminderPluginConfig extends PluginConfig {
  pollingInterval: number; // in seconds
  reminders: ReminderConfig[];
}

export interface TTSPluginConfig extends PluginConfig {
  provider: "openai" | "voicevox";
  // OpenAI settings
  openai?: {
    voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
    model?: "tts-1" | "tts-1-hd";
    speed?: number;
  };
  // VOICEVOX settings
  voicevox?: {
    speaker: number; // Speaker ID (3 = ずんだもん)
    baseUrl?: string; // VOICEVOX API URL (default: http://localhost:50021)
  };
}

export interface LLMPluginConfig extends PluginConfig {
  provider: "openai" | "ollama";
  openai?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  };
  ollama?: {
    model?: string;
    baseUrl?: string;
    maxTokens?: number;
    temperature?: number;
  };
}

export interface PluginsConfig {
  plugins: {
    weather?: WeatherPluginConfig;
    calendar?: CalendarPluginConfig;
    time?: TimePluginConfig;
    reminder?: ReminderPluginConfig;
    tts?: TTSPluginConfig;
    llm?: LLMPluginConfig;
    [key: string]: PluginConfig | undefined;
  };
}
