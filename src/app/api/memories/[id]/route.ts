import { NextRequest, NextResponse } from "next/server";
import { getMemoryRepository } from "@/lib/repositories";
import { getEmbeddingProvider } from "@/lib/providers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/memories/[id] - Get a memory
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const memoryRepo = getMemoryRepository();
    const memory = await memoryRepo.findById(id);

    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    return NextResponse.json({
      memory: {
        ...memory,
        tags: memory.tags ? JSON.parse(memory.tags) : [],
      },
    });
  } catch (error) {
    console.error("[API] GET /api/memories/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch memory" }, { status: 500 });
  }
}

/**
 * PUT /api/memories/[id] - Update a memory
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, tags, importance, status } = body;

    const memoryRepo = getMemoryRepository();

    // Check if memory exists
    const existing = await memoryRepo.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    // Update
    const updated = await memoryRepo.update(id, {
      title,
      content,
      tags,
      importance,
      status,
    });

    if (!updated) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    // Regenerate embedding if content changed
    if (content && content !== existing.content) {
      const embeddingProvider = getEmbeddingProvider();
      if (embeddingProvider) {
        try {
          const text = `${updated.title}: ${updated.content}`;
          const result = await embeddingProvider.embed(text);
          await memoryRepo.saveEmbedding(id, result.vector, result.model, result.dims);
        } catch (err) {
          console.error("[API] Failed to regenerate embedding:", err);
        }
      }
    }

    return NextResponse.json({
      memory: {
        ...updated,
        tags: updated.tags ? JSON.parse(updated.tags) : [],
      },
    });
  } catch (error) {
    console.error("[API] PUT /api/memories/[id] error:", error);
    return NextResponse.json({ error: "Failed to update memory" }, { status: 500 });
  }
}

/**
 * DELETE /api/memories/[id] - Delete a memory
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const hard = searchParams.get("hard") === "true";

    const memoryRepo = getMemoryRepository();

    let success: boolean;
    if (hard) {
      success = await memoryRepo.hardDelete(id);
    } else {
      success = await memoryRepo.softDelete(id);
    }

    if (!success) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/memories/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete memory" }, { status: 500 });
  }
}
