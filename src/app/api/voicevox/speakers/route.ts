import { NextResponse } from "next/server";
import { loadProvidersConfig } from "@/lib/providers/config-loader";

interface VoicevoxStyle {
  name: string;
  id: number;
}

interface VoicevoxSpeaker {
  name: string;
  speaker_uuid: string;
  styles: VoicevoxStyle[];
}

export interface FlattenedSpeaker {
  id: number;
  name: string;
  styleName: string;
}

let cachedSpeakers: FlattenedSpeaker[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const now = Date.now();
    if (cachedSpeakers && now - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({ speakers: cachedSpeakers });
    }

    const config = loadProvidersConfig();
    const baseUrl = config.providers?.tts?.voicevox?.baseUrl || "http://localhost:50021";

    const response = await fetch(`${baseUrl}/speakers`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`VOICEVOX speakers API failed: ${response.status}`);
    }

    const speakers: VoicevoxSpeaker[] = await response.json();

    // Flatten speakers with their styles
    const flattened: FlattenedSpeaker[] = [];
    for (const speaker of speakers) {
      for (const style of speaker.styles) {
        flattened.push({
          id: style.id,
          name: speaker.name,
          styleName: style.name,
        });
      }
    }

    // Sort by speaker name, then style name
    flattened.sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name, "ja");
      if (nameCompare !== 0) return nameCompare;
      return a.styleName.localeCompare(b.styleName, "ja");
    });

    cachedSpeakers = flattened;
    cacheTimestamp = now;

    return NextResponse.json({ speakers: flattened });
  } catch (error) {
    console.error("Failed to fetch VOICEVOX speakers:", error);
    return NextResponse.json(
      { speakers: [], error: "VOICEVOX unavailable" },
      { status: 503 }
    );
  }
}
