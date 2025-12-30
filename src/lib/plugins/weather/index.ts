import { Plugin, WeatherPluginConfig } from "../types";
import { fetchWeather, getWeatherDescription } from "./open-meteo";

export class WeatherPlugin implements Plugin {
  name = "weather";
  private config: WeatherPluginConfig;

  constructor(config: WeatherPluginConfig) {
    this.config = config;
  }

  async getContext(): Promise<string> {
    if (!this.config.enabled) {
      return "";
    }

    const location = this.config.locations.find(
      (loc) => loc.name === this.config.defaultLocation
    );

    if (!location) {
      console.warn(`Location not found: ${this.config.defaultLocation}`);
      return "";
    }

    try {
      const weather = await fetchWeather(location.latitude, location.longitude);
      const description = getWeatherDescription(
        weather.current_weather.weathercode
      );
      const temp = Math.round(weather.current_weather.temperature);
      const windSpeed = Math.round(weather.current_weather.windspeed);

      return `現在の${location.name}の天気: ${description}、気温${temp}°C、風速${windSpeed}km/h`;
    } catch (error) {
      console.error("Failed to fetch weather:", error);
      return "";
    }
  }
}
