import { Tool, ToolContext } from "./types";
import { getVLMProvider } from "@/lib/vlm";

/**
 * Tool that allows LLM to see what the camera is showing.
 * This enables vision-based conversations when the LLM decides it needs visual context.
 */
export const seeCameraTool: Tool = {
  definition: {
    name: "see_camera",
    description:
      "IMPORTANT: Use this tool FIRST when the user asks anything about themselves visually - what they're wearing, holding, showing, how they look, what's in front of the camera, etc. This is a camera that shows YOU what the USER looks like right now. Do NOT use web_search for questions about the user's appearance. Examples: 'What am I wearing?', 'What am I holding?', 'How do I look?', 'What color is this?', 'Can you see this?', 'What clothes do I have on?'",
    parameters: {
      type: "object",
      properties: {
        focus: {
          type: "string",
          description:
            "What to focus on when analyzing the image. E.g., 'what the person is holding', 'their clothing', 'their expression', 'objects in frame'",
        },
      },
      required: [],
    },
  },

  async execute(
    args: Record<string, unknown>,
    context?: ToolContext
  ): Promise<string> {
    // Check if image is available
    if (!context?.image) {
      return "カメラ画像が利用できません。ユーザーのカメラが有効になっていない可能性があります。";
    }

    // Get VLM provider
    const vlmProvider = getVLMProvider();
    if (!vlmProvider) {
      return "視覚分析サービスが利用できません。";
    }

    try {
      const focus = (args.focus as string) || "the scene";

      const prompt = `Describe what you see in this webcam image. Focus on: ${focus}

Provide a concise description in 2-3 sentences in Japanese. Be specific about:
- What the person is doing or showing
- What they are holding or wearing (if relevant)
- Any notable details that help answer their question`;

      const result = await vlmProvider.analyzeImage(context.image, prompt);
      return result;
    } catch (error) {
      console.error("[see_camera] VLM analysis failed:", error);
      return "画像の分析中にエラーが発生しました。";
    }
  },
};
