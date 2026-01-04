import dns from "dns";
import { Tool } from "./types";
import { sendSearchResults, isAutoShareEnabled } from "../discord";

// Force IPv4 first to avoid ETIMEDOUT on some networks
dns.setDefaultResultOrder("ipv4first");

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

// Store last search results for sharing
let lastSearchResults: TavilySearchResult[] = [];
let lastSearchQuery: string = "";

export function getLastSearchResults(): { query: string; results: TavilySearchResult[] } {
  return { query: lastSearchQuery, results: lastSearchResults };
}

interface TavilyResponse {
  results: TavilySearchResult[];
  answer?: string;
}

async function searchTavily(query: string, maxResults: number = 5): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      include_answer: true,
      search_depth: "basic",
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status}`);
  }

  const data = (await response.json()) as TavilyResponse;
  return data.results || [];
}

export const webSearchTool: Tool = {
  definition: {
    name: "web_search",
    description: "インターネットで情報を検索します。最新のニュースや知らない情報を調べるときに使います。",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "検索クエリ",
        },
      },
      required: ["query"],
    },
  },

  async execute(args: Record<string, unknown>): Promise<string> {
    const query = args.query as string;

    if (!query) {
      return "No search query provided.";
    }

    console.log(`[WebSearch] Searching for: ${query}`);

    try {
      const results = await searchTavily(query, 5);

      if (results.length === 0) {
        return `No results found for "${query}".`;
      }

      // Store for later sharing
      lastSearchQuery = query;
      lastSearchResults = results;

      // Include URLs in the formatted output for LLM awareness
      const formatted = results
        .map((r, i) => `${i + 1}. ${r.title}\n   ${r.content.slice(0, 200)}...\n   URL: ${r.url}`)
        .join("\n\n");

      console.log(`[WebSearch] Found ${results.length} results`);

      // Auto-share to Discord if enabled
      if (isAutoShareEnabled("searchResults")) {
        sendSearchResults(query, results).catch((err) => {
          console.error("[WebSearch] Discord share error:", err);
        });
        console.log("[WebSearch] Results shared to Discord");
      }

      return `Search results:\n\n${formatted}`;
    } catch (error) {
      console.error("[WebSearch] Error:", error);
      return `Error during search: ${(error as Error).message}`;
    }
  },
};
