import { NextRequest, NextResponse } from "next/server";
import { getMemoryRepository, getUserRepository } from "@/lib/repositories";
import { getEmbeddingProvider } from "@/lib/providers";

const DEFAULT_USER_ID = "default-user";

/**
 * GET /api/memories - List memories
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") || DEFAULT_USER_ID;
    const kind = searchParams.get("kind") as "profile" | "episode" | "knowledge" | null;
    const status = searchParams.get("status") as "active" | "archived" | "deleted" | null;

    const memoryRepo = getMemoryRepository();
    const memories = await memoryRepo.findMany({
      userId,
      kind: kind || undefined,
      status: status || "active",
    });

    // Parse tags from JSON
    const parsed = memories.map((m) => ({
      ...m,
      tags: m.tags ? JSON.parse(m.tags) : [],
    }));

    return NextResponse.json({ memories: parsed });
  } catch (error) {
    console.error("[API] GET /api/memories error:", error);
    return NextResponse.json({ error: "Failed to fetch memories" }, { status: 500 });
  }
}

/**
 * POST /api/memories - Create a memory
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId = DEFAULT_USER_ID,
      kind,
      title,
      content,
      tags = [],
      importance = 0.5,
    } = body;

    if (!kind || !title || !content) {
      return NextResponse.json(
        { error: "kind, title, content are required" },
        { status: 400 }
      );
    }

    // Create user if not exists
    const userRepo = getUserRepository();
    await userRepo.findOrCreate(userId);

    const memoryRepo = getMemoryRepository();
    const memory = await memoryRepo.create({
      userId,
      kind,
      title,
      content,
      tags,
      importance,
      source: "manual",
    });

    // Generate embedding
    const embeddingProvider = getEmbeddingProvider();
    if (embeddingProvider) {
      try {
        const text = `${title}: ${content}`;
        const result = await embeddingProvider.embed(text);
        await memoryRepo.saveEmbedding(memory.id, result.vector, result.model, result.dims);
      } catch (err) {
        console.error("[API] Failed to generate embedding:", err);
      }
    }

    return NextResponse.json({
      memory: {
        ...memory,
        tags,
      },
    });
  } catch (error) {
    console.error("[API] POST /api/memories error:", error);
    return NextResponse.json({ error: "Failed to create memory" }, { status: 500 });
  }
}
