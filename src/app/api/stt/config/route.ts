import { NextResponse } from "next/server";
import { getSTTClientConfig } from "@/lib/providers/stt";

/**
 * GET /api/stt/config
 * Returns client-safe STT configuration for the frontend
 *
 * Response:
 * - enabled: boolean - Whether STT is enabled
 * - provider: string - Current provider (openai, local, web)
 * - silenceDetection: object - Silence detection settings
 * - language: string - Language code for transcription
 */
export async function GET() {
  try {
    const config = getSTTClientConfig();

    return NextResponse.json(config);
  } catch (error) {
    console.error("[STT Config API] Error:", error);

    // Return default config on error
    return NextResponse.json({
      enabled: false,
      provider: "web",
      silenceDetection: {
        silenceThreshold: 1.5,
        volumeThreshold: 0.02,
        minRecordingDuration: 500,
        maxRecordingDuration: 60000,
      },
      language: "en-US",
    });
  }
}
