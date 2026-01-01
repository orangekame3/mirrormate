import { NextResponse } from "next/server";
import { fetchUpcomingEvents, CalendarEvent } from "@/lib/features/calendar/google-calendar";
import { loadFeaturesConfig } from "@/lib/features/config-loader";

export interface ReminderEvent extends CalendarEvent {
  minutesUntil: number;
  configuredMinutes: number;
  urgent: boolean;
}

export async function GET() {
  try {
    const config = loadFeaturesConfig();
    const reminderConfig = config.features.reminder;

    // Check if reminder is enabled
    if (!reminderConfig?.enabled) {
      return NextResponse.json({ reminders: [] });
    }

    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !process.env.GOOGLE_PRIVATE_KEY ||
      !calendarId
    ) {
      return NextResponse.json({ reminders: [] });
    }

    const events = await fetchUpcomingEvents(calendarId, 5);
    const now = new Date();
    const reminders: ReminderEvent[] = [];

    // Get configured reminder times
    const reminderTimes = reminderConfig.reminders || [
      { minutes: 10, urgent: false },
      { minutes: 5, urgent: true },
    ];

    for (const event of events) {
      const diffMs = event.start.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / 60000);

      // Check each configured reminder time
      for (const reminderTime of reminderTimes) {
        const targetMinutes = reminderTime.minutes;
        // Allow 1 minute tolerance (targetMinutes - 1 to targetMinutes + 1)
        if (diffMinutes >= targetMinutes - 1 && diffMinutes <= targetMinutes + 1) {
          reminders.push({
            ...event,
            minutesUntil: diffMinutes,
            configuredMinutes: targetMinutes,
            urgent: reminderTime.urgent ?? false,
          });
          break; // Only one reminder per event per check
        }
      }
    }

    return NextResponse.json({ reminders });
  } catch (error) {
    console.error("[Reminder API] Error:", error);
    return NextResponse.json({ reminders: [] });
  }
}
