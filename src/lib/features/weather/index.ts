import { Feature, WeatherFeatureConfig } from "../types";
import { fetchWeather, getWeatherDescription } from "./open-meteo";

// Cache settings
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  data: string;
  timestamp: number;
}

export class WeatherFeature implements Feature {
  name = "weather";
  private config: WeatherFeatureConfig;
  private cache: CacheEntry | null = null;

  constructor(config: WeatherFeatureConfig) {
    this.config = config;
  }

  private isCacheValid(): boolean {
    if (!this.cache) return false;
    return Date.now() - this.cache.timestamp < CACHE_TTL_MS;
  }

  async getContext(): Promise<string> {
    if (!this.config.enabled) {
      return "";
    }

    // Return cached data if valid
    if (this.isCacheValid()) {
      console.log("[Weather] Using cached data");
      return this.cache!.data;
    }

    console.log("[Weather] Cache expired or empty, fetching fresh data...");

    const location = this.config.locations.find(
      (loc) => loc.name === this.config.defaultLocation
    );

    if (!location) {
      console.warn(`[Weather] Location not found: ${this.config.defaultLocation}`);
      return "";
    }

    try {
      const weather = await fetchWeather(location.latitude, location.longitude);
      const description = getWeatherDescription(
        weather.current_weather.weathercode
      );
      const temp = Math.round(weather.current_weather.temperature);
      const windSpeed = Math.round(weather.current_weather.windspeed);

      console.log("[Weather] Fetched:", description, temp + "°C");

      const result = `現在の${location.name}の天気: ${description}、気温${temp}°C、風速${windSpeed}km/h`;

      // Update cache
      this.cache = {
        data: result,
        timestamp: Date.now(),
      };

      return result;
    } catch (error) {
      console.error("[Weather] Failed to fetch weather:", error);
      // Return stale cache if available
      if (this.cache) {
        console.log("[Weather] Returning stale cache due to error");
        return this.cache.data;
      }
      return "";
    }
  }
}
