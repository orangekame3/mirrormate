import { NextRequest, NextResponse } from "next/server";
import { getSTTProvider } from "@/lib/providers/stt";

/**
 * POST /api/stt
 * Transcribe audio using configured STT provider (OpenAI Whisper or Local Whisper)
 *
 * Request: multipart/form-data
 * - audio: Blob (required) - Audio file (webm, mp3, wav, etc.)
 * - language: string (optional) - Language code (e.g., "ja", "en")
 *
 * Response:
 * - transcript: string - Transcribed text
 * - language: string (optional) - Detected language
 * - duration: number (optional) - Audio duration in seconds
 */
export async function POST(request: NextRequest) {
  try {
    const provider = getSTTProvider();

    if (!provider) {
      return NextResponse.json(
        {
          error:
            "STT provider not configured. Set provider to 'openai' or 'local' in providers.yaml, or use Web Speech API on client.",
        },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const language = formData.get("language") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required. Send as 'audio' field in FormData." },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB for Whisper API)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: `Audio file too large. Maximum size is 25MB.` },
        { status: 400 }
      );
    }

    // Validate file type
    const supportedFormats = provider.getSupportedFormats();
    const fileExtension = audioFile.name.split(".").pop()?.toLowerCase();
    const mimeType = audioFile.type.split("/")[1]?.split(";")[0];

    const isSupported =
      (fileExtension && supportedFormats.includes(fileExtension)) ||
      (mimeType && supportedFormats.includes(mimeType));

    if (!isSupported) {
      console.log(
        `[STT API] File type check - extension: ${fileExtension}, mime: ${mimeType}`
      );
      // Allow webm even if not explicitly matched
      if (!audioFile.type.includes("webm") && !audioFile.type.includes("audio")) {
        return NextResponse.json(
          {
            error: `Unsupported audio format. Supported: ${supportedFormats.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    console.log(
      `[STT API] Transcribing: ${audioFile.size} bytes, type: ${audioFile.type}, provider: ${provider.getProviderName()}`
    );

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Transcribe
    const result = await provider.transcribe(audioBuffer, {
      language: language || undefined,
    });

    console.log(
      `[STT API] Success: "${result.transcript.substring(0, 50)}${result.transcript.length > 50 ? "..." : ""}"`
    );

    return NextResponse.json({
      transcript: result.transcript,
      language: result.language,
      duration: result.duration,
    });
  } catch (error) {
    console.error("[STT API] Error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to transcribe audio";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
