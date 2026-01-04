import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { loadProvidersConfig } from "@/lib/providers/config-loader";

// Word replacements for natural Japanese TTS pronunciation
const PRONUNCIATION_MAP: Record<string, string> = {
  // Apps & Services
  "Discord": "ディスコード",
  "discord": "ディスコード",
  "Twitter": "ツイッター",
  "twitter": "ツイッター",
  "YouTube": "ユーチューブ",
  "youtube": "ユーチューブ",
  "Google": "グーグル",
  "google": "グーグル",
  "Apple": "アップル",
  "iPhone": "アイフォン",
  "Android": "アンドロイド",
  "LINE": "ライン",
  "Slack": "スラック",
  "Zoom": "ズーム",
  "Teams": "チームズ",
  // Tech terms
  "API": "エーピーアイ",
  "URL": "ユーアールエル",
  "AI": "エーアイ",
  "OK": "オーケー",
  "Wi-Fi": "ワイファイ",
  "WiFi": "ワイファイ",
  "Bluetooth": "ブルートゥース",
  // Common English
  "check": "チェック",
  "link": "リンク",
  "share": "シェア",
};

/**
 * Normalize text for better Japanese TTS pronunciation
 */
function normalizeForTTS(text: string): string {
  let normalized = text;

  for (const [english, japanese] of Object.entries(PRONUNCIATION_MAP)) {
    // Use word boundary matching to avoid partial replacements
    const regex = new RegExp(`\\b${english}\\b`, "gi");
    normalized = normalized.replace(regex, japanese);
  }

  return normalized;
}

async function generateOpenAITTS(
  text: string,
  voice: string,
  model: string,
  speed: number
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const audioResponse = await openai.audio.speech.create({
    model: model as "tts-1" | "tts-1-hd",
    voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
    input: text,
    response_format: "mp3",
    speed,
  });

  const audioBuffer = await audioResponse.arrayBuffer();
  return Buffer.from(audioBuffer).toString("base64");
}

async function generateVoicevoxTTS(
  text: string,
  speaker: number,
  baseUrl: string
): Promise<string> {
  // Step 1: Create audio query
  const queryResponse = await fetch(
    `${baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`,
    { method: "POST" }
  );

  if (!queryResponse.ok) {
    throw new Error(`VOICEVOX audio_query failed: ${queryResponse.status}`);
  }

  const query = await queryResponse.json();

  // Step 2: Synthesize audio
  const synthesisResponse = await fetch(
    `${baseUrl}/synthesis?speaker=${speaker}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    }
  );

  if (!synthesisResponse.ok) {
    throw new Error(`VOICEVOX synthesis failed: ${synthesisResponse.status}`);
  }

  const audioBuffer = await synthesisResponse.arrayBuffer();
  return Buffer.from(audioBuffer).toString("base64");
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const config = loadProvidersConfig();
    const ttsConfig = config.providers.tts;

    // Default to OpenAI if TTS config is not set
    const provider = ttsConfig?.provider || "openai";

    // Normalize text for better pronunciation (mainly for Japanese TTS)
    const normalizedText = provider === "voicevox" ? normalizeForTTS(text) : text;

    let audioBase64: string;

    if (provider === "voicevox") {
      const speaker = ttsConfig?.voicevox?.speaker ?? 3;
      const baseUrl = ttsConfig?.voicevox?.baseUrl || "http://localhost:50021";

      console.log(`[TTS] Using VOICEVOX (speaker: ${speaker})`);
      audioBase64 = await generateVoicevoxTTS(normalizedText, speaker, baseUrl);
    } else {
      const voice = ttsConfig?.openai?.voice || "shimmer";
      const model = ttsConfig?.openai?.model || "tts-1";
      const speed = ttsConfig?.openai?.speed ?? 0.95;

      console.log(`[TTS] Using OpenAI (voice: ${voice})`);
      audioBase64 = await generateOpenAITTS(text, voice, model, speed);
    }

    return NextResponse.json({ audio: audioBase64 });
  } catch (error) {
    console.error("TTS API error:", error);
    return NextResponse.json(
      { error: "Failed to generate audio" },
      { status: 500 }
    );
  }
}
