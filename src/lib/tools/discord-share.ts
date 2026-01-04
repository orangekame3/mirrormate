import { Tool } from "./types";
import { sendTextMessage, sendSearchResults, isDiscordEnabled } from "../discord";
import { getLastSearchResults } from "./web-search";

export const discordShareTool: Tool = {
  definition: {
    name: "share_to_discord",
    description:
      "Share information to the user's Discord. Use this when the user wants to save or share search results, links, or important information to their phone. If sharing recent search results, URLs will be automatically included.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title of the shared content",
        },
        content: {
          type: "string",
          description: "The content to share (text, summary, or information)",
        },
        url: {
          type: "string",
          description: "Optional URL to include",
        },
        includeSearchResults: {
          type: "string",
          description: "Set to 'true' to include recent search results with their source URLs",
        },
      },
      required: ["title", "content"],
    },
  },

  async execute(args: Record<string, unknown>): Promise<string> {
    const title = args.title as string;
    const content = args.content as string;
    const url = args.url as string | undefined;
    const includeSearchResults = args.includeSearchResults === "true" || args.includeSearchResults === true;

    if (!isDiscordEnabled()) {
      return "Discord integration is not configured. Please set DISCORD_WEBHOOK_URL environment variable.";
    }

    console.log(`[Discord] Sharing: ${title}, includeSearchResults: ${includeSearchResults}`);

    try {
      let success = false;

      // If including search results, send them with URLs
      if (includeSearchResults) {
        const { query, results } = getLastSearchResults();
        if (results.length > 0) {
          success = await sendSearchResults(query || title, results);
          if (success) {
            // Return a message that encourages natural voice confirmation
            return `Discord送信完了！${results.length}件のリンク付きで送った。ユーザーに「送ったよ！」と短く伝えて。`;
          }
        }
      }

      // Fall back to text message
      success = await sendTextMessage(title, content, url);

      if (success) {
        // Return a message that encourages natural voice confirmation
        return `Discord送信完了！「${title}」を送った。ユーザーに「送ったよ！」と短く伝えて。`;
      } else {
        return "Discordへの送信に失敗した。設定を確認するよう伝えて。";
      }
    } catch (error) {
      console.error("[Discord] Share error:", error);
      return `Discordエラー: ${(error as Error).message}`;
    }
  },
};
