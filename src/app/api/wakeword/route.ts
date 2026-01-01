import { NextResponse } from "next/server";
import { getWakeWordConfig } from "@/lib/character";

export async function GET() {
  try {
    const config = getWakeWordConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("[WakeWord API] Error:", error);
    return NextResponse.json(
      { enabled: false, phrase: "OK ミラー", timeout: 15 },
      { status: 200 }
    );
  }
}
