import { NextResponse } from "next/server";
import { getCharacterPresets, type CharacterPreset } from "@/lib/character";

export interface CharacterPresetResponse {
  id: string;
  name: string;
  description: string;
  recommendedVoice?: number;
}

export async function GET() {
  try {
    const presets = getCharacterPresets();

    const response: CharacterPresetResponse[] = presets.map(
      (preset: CharacterPreset) => ({
        id: preset.id,
        name: preset.name,
        description: preset.description,
        recommendedVoice: preset.recommendedVoice,
      })
    );

    return NextResponse.json({ characters: response });
  } catch (error) {
    console.error("Failed to load character presets:", error);
    return NextResponse.json(
      { characters: [], error: "Failed to load characters" },
      { status: 500 }
    );
  }
}
