import { Feature, WeatherFeatureConfig } from "../types";
import { fetchWeather, getWeatherDescription } from "./open-meteo";

export class WeatherFeature implements Feature {
  name = "weather";
  private config: WeatherFeatureConfig;

  constructor(config: WeatherFeatureConfig) {
    this.config = config;
  }

  async getContext(): Promise<string> {
    console.log("[Weather] Starting to fetch weather data...");

    if (!this.config.enabled) {
      console.log("[Weather] Feature is disabled");
      return "";
    }

    const location = this.config.locations.find(
      (loc) => loc.name === this.config.defaultLocation
    );

    if (!location) {
      console.warn(`[Weather] Location not found: ${this.config.defaultLocation}`);
      return "";
    }

    console.log(`[Weather] Fetching weather for ${location.name} (${location.latitude}, ${location.longitude})`);

    try {
      const weather = await fetchWeather(location.latitude, location.longitude);
      const description = getWeatherDescription(
        weather.current_weather.weathercode
      );
      const temp = Math.round(weather.current_weather.temperature);
      const windSpeed = Math.round(weather.current_weather.windspeed);

      console.log("[Weather] Successfully fetched weather:");
      console.log(`  - Weather code: ${weather.current_weather.weathercode} (${description})`);
      console.log(`  - Temperature: ${temp}°C`);
      console.log(`  - Wind speed: ${windSpeed}km/h`);

      const result = `現在の${location.name}の天気: ${description}、気温${temp}°C、風速${windSpeed}km/h`;
      console.log("[Weather] Context result:", result);
      return result;
    } catch (error) {
      console.error("[Weather] Failed to fetch weather:", error);
      return "";
    }
  }
}
