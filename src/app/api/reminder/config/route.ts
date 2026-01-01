import { NextResponse } from "next/server";
import { loadFeaturesConfig } from "@/lib/features/config-loader";

export async function GET() {
  try {
    const config = loadFeaturesConfig();
    const reminderConfig = config.features.reminder;

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
