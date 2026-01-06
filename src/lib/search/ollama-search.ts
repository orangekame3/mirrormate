import dns from "dns";

// Force IPv4 first to avoid ETIMEDOUT on some networks
dns.setDefaultResultOrder("ipv4first");

export interface OllamaSearchResult {
  title: string;
  url: string;
  content: string;
}

interface OllamaSearchResponse {
  results: OllamaSearchResult[];
}

/**
 * Search the web using Ollama Web Search API
 */
export async function searchOllama(
  query: string,
  maxResults: number = 5
): Promise<OllamaSearchResult[]> {
  const apiKey = process.env.OLLAMA_API_KEY;

  if (!apiKey) {
    throw new Error("OLLAMA_API_KEY is not configured");
  }

  console.log(`[Ollama Search] Searching for: ${query}`);

  const response = await fetch("https://ollama.com/api/web_search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      max_results: Math.min(maxResults, 10),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Ollama Search] API error ${response.status}:`, errorText);
    throw new Error(`Ollama Search API error: ${response.status}`);
  }

  const data = (await response.json()) as OllamaSearchResponse;
  console.log(`[Ollama Search] Found ${data.results?.length || 0} results`);

  return data.results || [];
}

/**
 * Check if Ollama Search is enabled
 */
export function isOllamaSearchEnabled(): boolean {
  return !!process.env.OLLAMA_API_KEY;
}
