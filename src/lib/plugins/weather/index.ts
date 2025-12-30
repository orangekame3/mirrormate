import { Plugin, WeatherPluginConfig } from "../types";
import { fetchWeather, getWeatherDescription } from "./open-meteo";

export class WeatherPlugin implements Plugin {
  name = "weather";
  private config: WeatherPluginConfig;

  constructor(config: WeatherPluginConfig) {
    this.config = config;
  }

  async getContext(): Promise<string> {
    console.log("[WeatherPlugin] Starting to fetch weather data...");

    if (!this.config.enabled) {
      console.log("[WeatherPlugin] Plugin is disabled");
      return "";
    }

    const location = this.config.locations.find(
      (loc) => loc.name === this.config.defaultLocation
    );

    if (!location) {
      console.warn(`[WeatherPlugin] Location not found: ${this.config.defaultLocation}`);
      return "";
    }

    console.log(`[WeatherPlugin] Fetching weather for ${location.name} (${location.latitude}, ${location.longitude})`);

    try {
      const weather = await fetchWeather(location.latitude, location.longitude);
      const description = getWeatherDescription(
        weather.current_weather.weathercode
      );
      const temp = Math.round(weather.current_weather.temperature);
      const windSpeed = Math.round(weather.current_weather.windspeed);

      console.log("[WeatherPlugin] Successfully fetched weather:");
      console.log(`  - Weather code: ${weather.current_weather.weathercode} (${description})`);
      console.log(`  - Temperature: ${temp}°C`);
      console.log(`  - Wind speed: ${windSpeed}km/h`);

      const result = `現在の${location.name}の天気: ${description}、気温${temp}°C、風速${windSpeed}km/h`;
      console.log("[WeatherPlugin] Context result:", result);
      return result;
    } catch (error) {
      console.error("[WeatherPlugin] Failed to fetch weather:", error);
      return "";
    }
  }
}
