import { NextRequest, NextResponse } from "next/server";
import { getUserRepository, getUserSettingsRepository } from "@/lib/repositories";

const DEFAULT_USER_ID = "default-user";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || DEFAULT_USER_ID;

    // Ensure user exists
    const userRepo = getUserRepository();
    await userRepo.findOrCreate(userId);

    const settingsRepo = getUserSettingsRepository();
    const settings = await settingsRepo.findOrCreate(userId);

    return NextResponse.json({
      speakerId: settings.speakerId,
      characterId: settings.characterId,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, speakerId, characterId } = await request.json();
    const currentUserId = userId || DEFAULT_USER_ID;

    // Ensure user exists
    const userRepo = getUserRepository();
    await userRepo.findOrCreate(currentUserId);

    const settingsRepo = getUserSettingsRepository();
    const updated = await settingsRepo.update(currentUserId, {
      speakerId: speakerId ?? null,
      characterId: characterId ?? null,
    });

    return NextResponse.json({
      speakerId: updated.speakerId,
      characterId: updated.characterId,
    });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
