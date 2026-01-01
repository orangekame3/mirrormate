import { Plugin, TimePluginConfig } from "../types";

export class TimePlugin implements Plugin {
  name = "time";
  private config: TimePluginConfig;

  constructor(config: TimePluginConfig) {
    this.config = config;
  }

  private getJapaneseWeekday(date: Date): string {
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return weekdays[date.getDay()];
  }

  async getContext(): Promise<string> {
    if (!this.config.enabled) {
      return "";
    }

    const now = new Date();
    const timezone = this.config.timezone || "Asia/Tokyo";

    // Format date and time in the specified timezone
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || "";

    const year = getPart("year");
    const month = getPart("month");
    const day = getPart("day");
    const weekday = getPart("weekday");
    const hour = getPart("hour");
    const minute = getPart("minute");

    const timeStr = `${hour}時${minute}分`;
    const dateStr = `${year}年${month}月${day}日（${weekday}）`;

    console.log(`[TimePlugin] Current time: ${dateStr} ${timeStr}`);

    return `現在時刻: ${dateStr} ${timeStr}`;
  }
}
