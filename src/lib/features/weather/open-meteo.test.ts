import { describe, it, expect } from "vitest";
import { getWeatherDescription } from "./open-meteo";

describe("getWeatherDescription", () => {
  it("returns correct description for clear sky", () => {
    expect(getWeatherDescription(0)).toBe("快晴");
  });

  it("returns correct description for sunny", () => {
    expect(getWeatherDescription(1)).toBe("晴れ");
  });

  it("returns correct description for cloudy", () => {
    expect(getWeatherDescription(3)).toBe("曇り");
  });

  it("returns correct description for rain", () => {
    expect(getWeatherDescription(63)).toBe("雨");
  });

  it("returns correct description for snow", () => {
    expect(getWeatherDescription(73)).toBe("雪");
  });

  it("returns correct description for thunderstorm", () => {
    expect(getWeatherDescription(95)).toBe("雷雨");
  });

  it('returns "不明" for unknown weather code', () => {
    expect(getWeatherDescription(999)).toBe("不明");
  });
});
