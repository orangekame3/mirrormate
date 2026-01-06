import { Feature, TimeFeatureConfig } from "../types";
import { getLocale } from "@/lib/app";

export class TimeFeature implements Feature {
  name = "time";
  private config: TimeFeatureConfig;

  constructor(config: TimeFeatureConfig) {
    this.config = config;
  }

  async getContext(): Promise<string> {
    if (!this.config.enabled) {
      return "";
    }

    const now = new Date();
    const timezone = this.config.timezone || "Asia/Tokyo";
    const locale = getLocale();
    const isJapanese = locale === "ja";

    // Format date and time in the specified timezone
    const localeCode = isJapanese ? "ja-JP" : "en-US";
    const formatter = new Intl.DateTimeFormat(localeCode, {
      timeZone: timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: !isJapanese,
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";

    let timeStr: string;
    let dateStr: string;

    if (isJapanese) {
      const year = getPart("year");
      const month = getPart("month");
      const day = getPart("day");
      const weekday = getPart("weekday");
      const hour = getPart("hour");
      const minute = getPart("minute");
      timeStr = `${hour}時${minute}分`;
      dateStr = `${year}年${month}月${day}日（${weekday}）`;
    } else {
      const weekday = getPart("weekday");
      const month = getPart("month");
      const day = getPart("day");
      const year = getPart("year");
      const hour = getPart("hour");
      const minute = getPart("minute");
      const dayPeriod = getPart("dayPeriod");
      timeStr = `${hour}:${minute} ${dayPeriod}`;
      dateStr = `${weekday}, ${month} ${day}, ${year}`;
    }

    console.log(`[Time] Current time: ${dateStr} ${timeStr}`);

    const label = isJapanese ? "現在時刻" : "Current time";
    return `${label}: ${dateStr} ${timeStr}`;
  }
}
