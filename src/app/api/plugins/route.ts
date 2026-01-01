import { NextResponse } from "next/server";
import {
  getEnabledPluginsByPosition,
  getAvailablePlugins,
} from "@/lib/plugins/registry";

export async function GET() {
  try {
    const enabledByPosition = getEnabledPluginsByPosition();
    const available = getAvailablePlugins();

    return NextResponse.json({
      plugins: enabledByPosition,
      available,
    });
  } catch (error) {
    console.error("[API/Plugins] Error:", error);
    return NextResponse.json(
      { error: "Failed to load plugins" },
      { status: 500 }
    );
  }
}
