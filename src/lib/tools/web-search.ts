import { Tool, ToolExecuteResult } from "./types";
import { sendSearchResults, isAutoShareEnabled } from "../discord";
import { searchOllama, isOllamaSearchEnabled, type OllamaSearchResult } from "../search/ollama-search";

// Unified search result interface
export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

// Store search history for sharing (max 5 entries)
const MAX_SEARCH_HISTORY = 5;
const searchHistory: Array<{ query: string; results: SearchResult[]; timestamp: number }> = [];

/**
 * Add search results to history
 */
function addToSearchHistory(query: string, results: SearchResult[]): void {
  // Remove oldest if at capacity
  if (searchHistory.length >= MAX_SEARCH_HISTORY) {
    searchHistory.shift();
  }
  searchHistory.push({ query, results, timestamp: Date.now() });
}

/**
 * Get the most recent search results
 */
export function getLastSearchResults(): { query: string; results: SearchResult[] } {
  if (searchHistory.length === 0) {
    return { query: "", results: [] };
  }
  const last = searchHistory[searchHistory.length - 1];
  return { query: last.query, results: last.results };
}

/**
 * Find search results by query (partial match)
 */
export function findSearchResultsByQuery(searchTerm: string): { query: string; results: SearchResult[] } | null {
  if (!searchTerm) return null;
  const normalizedTerm = searchTerm.toLowerCase().trim();

  // Search from newest to oldest
  for (let i = searchHistory.length - 1; i >= 0; i--) {
    const entry = searchHistory[i];
    const normalizedQuery = entry.query.toLowerCase();

    // Check for partial match
    if (normalizedQuery.includes(normalizedTerm) || normalizedTerm.includes(normalizedQuery)) {
      return { query: entry.query, results: entry.results };
    }
  }

  return null;
}

/**
 * Get all search history (for debugging)
 */
export function getSearchHistory(): Array<{ query: string; resultsCount: number }> {
  return searchHistory.map(h => ({ query: h.query, resultsCount: h.results.length }));
}

/**
 * Perform web search using Ollama Web Search API
 */
async function performSearch(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  if (!isOllamaSearchEnabled()) {
    throw new Error("OLLAMA_API_KEY is not configured");
  }

  console.log(`[WebSearch] Using Ollama Web Search`);
  const results = await searchOllama(query, maxResults);
  return results.map((r: OllamaSearchResult) => ({
    title: r.title,
    url: r.url,
    content: r.content,
  }));
}

/**
 * Check if search is available
 */
export function isSearchEnabled(): boolean {
  return isOllamaSearchEnabled();
}

export const webSearchTool: Tool = {
  definition: {
    name: "web_search",
    description: "インターネットで最新情報を検索します。必ず使うべき場面: ニュース、今日の出来事、知らない事柄、正確な情報が必要なとき。自分の知識に自信がないときは必ずこのツールを呼び出してください。",
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

  async execute(args: Record<string, unknown>): Promise<ToolExecuteResult> {
    const query = args.query as string;

    if (!query) {
      return { result: "No search query provided." };
    }

    console.log(`[WebSearch] Searching for: ${query}`);

    try {
      const results = await performSearch(query, 5);

      if (results.length === 0) {
        return { result: `No results found for "${query}".` };
      }

      // Store in search history for later sharing
      addToSearchHistory(query, results);

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

      // Return result with info card for UI display
      return {
        result: `Search results:\n\n${formatted}`,
        infoCard: {
          type: "search",
          title: `Search: ${query}`,
          items: results.slice(0, 3).map((r) => r.title),
        },
      };
    } catch (error) {
      console.error("[WebSearch] Error:", error);
      return { result: `Error during search: ${(error as Error).message}` };
    }
  },
};
