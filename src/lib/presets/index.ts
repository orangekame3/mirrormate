import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { getLocale, type Locale } from "../app";

export interface LocalePreset {
  time: {
    timezone: string;
  };
  weather: {
    locations: Array<{
      name: string;
      latitude: number;
      longitude: number;
    }>;
    defaultLocation: string;
  };
  clock: {
    timezone: string;
    format24h: boolean;
    locale: string;
  };
  stt: {
    language: string;
    webLanguage: string;
  };
}

let cachedPreset: LocalePreset | null = null;
let cachedLocale: Locale | null = null;

function getPresetPath(locale: Locale): string {
  const configDir = path.join(process.cwd(), "config", "presets");
  return path.join(configDir, `${locale}.yaml`);
}

const defaultPresets: Record<Locale, LocalePreset> = {
  ja: {
    time: { timezone: "Asia/Tokyo" },
    weather: {
      locations: [
        { name: "東京", latitude: 35.6762, longitude: 139.6503 },
      ],
      defaultLocation: "東京",
    },
    clock: { timezone: "Asia/Tokyo", format24h: true, locale: "ja-JP" },
    stt: { language: "ja", webLanguage: "ja-JP" },
  },
  en: {
    time: { timezone: "America/Los_Angeles" },
    weather: {
      locations: [
        { name: "San Francisco", latitude: 37.7749, longitude: -122.4194 },
      ],
      defaultLocation: "San Francisco",
    },
    clock: { timezone: "America/Los_Angeles", format24h: false, locale: "en-US" },
    stt: { language: "en", webLanguage: "en-US" },
  },
};

/**
 * Load locale preset based on current app locale
 */
export function loadLocalePreset(): LocalePreset {
  const locale = getLocale();

  // Return cached preset if locale hasn't changed
  if (cachedPreset && cachedLocale === locale) {
    return cachedPreset;
  }

  const presetPath = getPresetPath(locale);
  console.log(`[Presets] Loading preset for locale: ${locale}`);

  if (!fs.existsSync(presetPath)) {
    console.log(`[Presets] Preset file not found, using defaults for: ${locale}`);
    cachedPreset = defaultPresets[locale];
    cachedLocale = locale;
    return cachedPreset;
  }

  try {
    const fileContents = fs.readFileSync(presetPath, "utf8");
    const preset = yaml.load(fileContents) as Partial<LocalePreset>;

    // Merge with defaults to ensure all fields exist
    cachedPreset = {
      time: { ...defaultPresets[locale].time, ...preset.time },
      weather: { ...defaultPresets[locale].weather, ...preset.weather },
      clock: { ...defaultPresets[locale].clock, ...preset.clock },
      stt: { ...defaultPresets[locale].stt, ...preset.stt },
    };
    cachedLocale = locale;

    return cachedPreset;
  } catch (error) {
    console.error(`[Presets] Failed to load preset: ${error}`);
    cachedPreset = defaultPresets[locale];
    cachedLocale = locale;
    return cachedPreset;
  }
}

/**
 * Get time settings from preset
 */
export function getTimePreset() {
  return loadLocalePreset().time;
}

/**
 * Get weather settings from preset
 */
export function getWeatherPreset() {
  return loadLocalePreset().weather;
}

/**
 * Get clock plugin settings from preset
 */
export function getClockPreset() {
  return loadLocalePreset().clock;
}

/**
 * Get STT settings from preset
 */
export function getSTTPreset() {
  return loadLocalePreset().stt;
}

/**
 * Clear preset cache (useful when locale changes)
 */
export function clearPresetCache(): void {
  cachedPreset = null;
  cachedLocale = null;
}
