import { NextResponse } from "next/server";
import { loadPluginsConfig } from "@/lib/plugins/config-loader";

export async function GET() {
  try {
    const config = loadPluginsConfig();
    const reminderConfig = config.plugins.reminder;

    if (!reminderConfig?.enabled) {
      return NextResponse.json({
        enabled: false,
        pollingInterval: 30,
        reminders: [],
      });
    }

    return NextResponse.json({
      enabled: true,
      pollingInterval: reminderConfig.pollingInterval || 30,
      reminders: reminderConfig.reminders || [
        { minutes: 10, urgent: false },
        { minutes: 5, urgent: true },
      ],
    });
  } catch (error) {
    console.error("[Reminder Config API] Error:", error);
    return NextResponse.json({
      enabled: false,
      pollingInterval: 30,
      reminders: [],
    });
  }
}
