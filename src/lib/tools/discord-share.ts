import { Tool, ToolExecuteResult } from "./types";
import { sendTextMessage, sendSearchResults, isDiscordEnabled } from "../discord";
import { getLastSearchResults, findSearchResultsByQuery } from "./web-search";

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

  async execute(args: Record<string, unknown>): Promise<ToolExecuteResult> {
    const title = (args.title as string) || "";
    const content = (args.content as string) || "";
    const url = args.url as string | undefined;
    const includeSearchResults = args.includeSearchResults === "true" || args.includeSearchResults === true;

    if (!isDiscordEnabled()) {
      return { result: "Discord integration is not configured. Please set DISCORD_WEBHOOK_URL environment variable." };
    }

    // Validate required parameters
    if (!title && !content) {
      return { result: "Discord送信には title または content が必要です。" };
    }

    console.log(`[Discord] Sharing: ${title || content.substring(0, 30)}, includeSearchResults: ${includeSearchResults}`);

    try {
      let success = false;
      let sharedQuery = title;
      let sharedCount = 0;

      // If including search results, send them with URLs
      if (includeSearchResults) {
        // First, try to find results matching the title (user's intent)
        let searchData = findSearchResultsByQuery(title);

        // Fall back to the most recent search results
        if (!searchData || searchData.results.length === 0) {
          const lastResults = getLastSearchResults();
          if (lastResults.results.length > 0) {
            searchData = lastResults;
          }
        }

        if (searchData && searchData.results.length > 0) {
          const { query, results } = searchData;
          success = await sendSearchResults(query, results);
          sharedQuery = query;
          sharedCount = results.length;
          if (success) {
            const topResults = results.slice(0, 2).map(r => r.title).join("、");
            return {
              result: `Discord送信完了！「${query}」について${results.length}件のリンク付きで送った（${topResults}など）。ユーザーに「送ったよ！リンクも付けておいたからね」と短く伝えて。`,
              infoCard: {
                type: "discord",
                title: "Sent to Discord",
                items: [`${sharedCount} items shared`, sharedQuery],
              },
            };
          }
        }
      }

      // Fall back to text message
      success = await sendTextMessage(title, content, url);

      if (success) {
        return {
          result: `Discord送信完了！「${title}」の内容を送った。ユーザーに「送ったよ！」と短く伝えて。`,
          infoCard: {
            type: "discord",
            title: "Sent to Discord",
            items: [title],
          },
        };
      } else {
        return { result: "Discordへの送信に失敗した。設定を確認するよう伝えて。" };
      }
    } catch (error) {
      console.error("[Discord] Share error:", error);
      return { result: `Discordエラー: ${(error as Error).message}` };
    }
  },
};
