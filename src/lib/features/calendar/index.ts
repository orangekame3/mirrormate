import { Feature, CalendarFeatureConfig } from "../types";
import { fetchTodayEvents, fetchUpcomingEvents, CalendarEvent } from "./google-calendar";

// Cache settings
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: string;
  timestamp: number;
}

export class CalendarFeature implements Feature {
  name = "calendar";
  private config: CalendarFeatureConfig;
  private cache: CacheEntry | null = null;

  constructor(config: CalendarFeatureConfig) {
    this.config = config;
  }

  private isCacheValid(): boolean {
    if (!this.cache) return false;
    return Date.now() - this.cache.timestamp < CACHE_TTL_MS;
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
    if (!this.config.enabled) {
      return "";
    }

    // Return cached data if valid
    if (this.isCacheValid()) {
      console.log("[Calendar] Using cached data");
      return this.cache!.data;
    }

    console.log("[Calendar] Cache expired or empty, fetching fresh data...");

    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY ||
      !calendarId
    ) {
      return "";
    }

    try {
      const [todayEvents, upcomingEvents] = await Promise.all([
        fetchTodayEvents(calendarId, this.config.maxResults),
        fetchUpcomingEvents(calendarId, 1),
      ]);

      console.log("[Calendar] Fetched:", todayEvents.length, "today,", upcomingEvents.length, "upcoming");

      const parts: string[] = [];
      parts.push(this.formatTodayEvents(todayEvents));

      const nextEventStr = this.formatNextEvent(upcomingEvents);
      if (nextEventStr) {
        parts.push(nextEventStr);
      }

      const result = parts.join("\n");

      // Update cache
      this.cache = {
        data: result,
        timestamp: Date.now(),
      };

      return result;
    } catch (error) {
      console.error("[Calendar] Failed to fetch calendar events:", error);
      // Return stale cache if available
      if (this.cache) {
        console.log("[Calendar] Returning stale cache due to error");
        return this.cache.data;
      }
      return "";
    }
  }
}
