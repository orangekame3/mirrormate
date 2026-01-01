import https from "https";

export interface OpenMeteoResponse {
  current_weather: {
    temperature: number;
    weathercode: number;
    windspeed: number;
    winddirection: number;
    is_day: number;
    time: string;
  };
}

const WEATHER_CODES: Record<number, string> = {
  0: "快晴",
  1: "晴れ",
  2: "一部曇り",
  3: "曇り",
  45: "霧",
  48: "霧氷",
  51: "小雨",
  53: "雨",
  55: "強い雨",
  56: "凍雨",
  57: "強い凍雨",
  61: "小雨",
  63: "雨",
  65: "大雨",
  66: "凍雨",
  67: "強い凍雨",
  71: "小雪",
  73: "雪",
  75: "大雪",
  77: "霧雪",
  80: "にわか雨",
  81: "にわか雨",
  82: "激しいにわか雨",
  85: "にわか雪",
  86: "激しいにわか雪",
  95: "雷雨",
  96: "雹を伴う雷雨",
  99: "激しい雹を伴う雷雨",
};

export function getWeatherDescription(code: number): string {
  return WEATHER_CODES[code] || "不明";
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
  timeoutMs: number = 5000
): Promise<OpenMeteoResponse> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude.toString());
  url.searchParams.set("longitude", longitude.toString());
  url.searchParams.set("current_weather", "true");
  url.searchParams.set("timezone", "Asia/Tokyo");

  return new Promise((resolve, reject) => {
    const req = https.get(url.toString(), { timeout: timeoutMs }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Weather API error: ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error("Failed to parse weather response"));
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Weather API timeout"));
    });
  });
}
