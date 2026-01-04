import { NextResponse } from "next/server";
import { isDiscordEnabled, isAutoShareEnabled, sendTextMessage } from "@/lib/discord";

export async function GET() {
  const enabled = isDiscordEnabled();
  const autoShareSearch = isAutoShareEnabled("searchResults");

  console.log("[Discord Test] Checking configuration...");

  const status = {
    enabled,
    autoShare: {
      searchResults: autoShareSearch,
    },
    envVarSet: !!process.env.DISCORD_WEBHOOK_URL,
  };

  return NextResponse.json(status);
}

export async function POST() {
  console.log("[Discord Test] Sending test message...");

  if (!isDiscordEnabled()) {
    return NextResponse.json(
      { success: false, error: "Discord is not enabled" },
      { status: 400 }
    );
  }

  try {
    const success = await sendTextMessage(
      "Test Message",
      "This is a test message from MirrorMate!",
    );

    return NextResponse.json({ success });
  } catch (error) {
    console.error("[Discord Test] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
