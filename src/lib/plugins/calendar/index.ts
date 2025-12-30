import { Plugin, CalendarPluginConfig } from "../types";
import { fetchTodayEvents, fetchUpcomingEvents, CalendarEvent } from "./google-calendar";

export class CalendarPlugin implements Plugin {
  name = "calendar";
  private config: CalendarPluginConfig;

  constructor(config: CalendarPluginConfig) {
    this.config = config;
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 0) {
      return "進行中";
    }
    if (diffMins < 60) {
      return `あと${diffMins}分`;
    }
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) {
      return `あと${diffHours}時間`;
    }
    return "";
  }

  private formatTodayEvents(events: CalendarEvent[]): string {
    if (events.length === 0) {
      return "今日の予定: なし";
    }

    const formatted = events
      .map((e) => `${this.formatTime(e.start)} ${e.summary}`)
      .join("、");
    return `今日の予定: ${formatted}`;
  }

  private formatNextEvent(events: CalendarEvent[]): string {
    if (events.length === 0) {
      return "";
    }

    const next = events[0];
    const relative = this.formatRelativeTime(next.start);
    const relativeStr = relative ? `（${relative}）` : "";
    return `次の予定: ${this.formatTime(next.start)} ${next.summary}${relativeStr}`;
  }

  async getContext(): Promise<string> {
    console.log("[CalendarPlugin] Starting to fetch calendar data...");

    if (!this.config.enabled) {
      console.log("[CalendarPlugin] Plugin is disabled");
      return "";
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY ||
      !calendarId
    ) {
      console.log("[CalendarPlugin] Missing credentials:");
      console.log("  - GOOGLE_SERVICE_ACCOUNT_EMAIL:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? "set" : "not set");
      console.log("  - GOOGLE_PRIVATE_KEY:", process.env.GOOGLE_PRIVATE_KEY ? "set" : "not set");
      console.log("  - GOOGLE_CALENDAR_ID:", calendarId ? "set" : "not set");
      return "";
    }

    console.log("[CalendarPlugin] Credentials found, fetching from calendar:", calendarId);

    try {
      const [todayEvents, upcomingEvents] = await Promise.all([
        fetchTodayEvents(calendarId, this.config.maxResults),
        fetchUpcomingEvents(calendarId, 1),
      ]);

      console.log("[CalendarPlugin] Successfully fetched events:");
      console.log("  - Today's events:", todayEvents.length);
      console.log("  - Upcoming events:", upcomingEvents.length);

      if (todayEvents.length > 0) {
        console.log("[CalendarPlugin] Today's events detail:");
        todayEvents.forEach((e, i) => {
          console.log(`    ${i + 1}. ${e.summary} (${e.start.toISOString()})`);
        });
      }

      const parts: string[] = [];
      parts.push(this.formatTodayEvents(todayEvents));

      const nextEventStr = this.formatNextEvent(upcomingEvents);
      if (nextEventStr) {
        parts.push(nextEventStr);
      }

      const result = parts.join("\n");
      console.log("[CalendarPlugin] Context result:", result);
      return result;
    } catch (error) {
      console.error("[CalendarPlugin] Failed to fetch calendar events:", error);
      return "";
    }
  }
}
