import { NextRequest, NextResponse } from "next/server";
import { getVLMProvider } from "@/lib/vlm";

interface AnalyzeRequestBody {
  image: string; // Base64 encoded image
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;

    if (!body.image) {
      return NextResponse.json(
        { error: "image is required" },
        { status: 400 }
      );
    }

    const vlmProvider = getVLMProvider();

    if (!vlmProvider) {
      console.log("[Vision Analyze] VLM provider is not enabled");
      return NextResponse.json(
        { error: "VLM provider is not configured", waving: false },
        { status: 503 }
      );
    }

    console.log("[Vision Analyze] Checking for waving gesture...");
    const result = await vlmProvider.checkWaving(body.image);

    console.log(
      `[Vision Analyze] Result: waving=${result.waving}, confidence=${result.confidence}, reason=${result.reason}`
    );

    return NextResponse.json({
      waving: result.waving,
      confidence: result.confidence,
      reason: result.reason,
      rawResponse: result.rawResponse,
    });
  } catch (error) {
    console.error("[Vision Analyze] Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze image", waving: false },
      { status: 500 }
    );
  }
}
