/**
 * You.com API Client
 * Provides search and content fetching capabilities for mission brief enrichment
 */

export interface SearchResult {
  url: string;
  title: string;
  description: string;
  snippets?: string[];
  thumbnail_url?: string;
  favicon_url?: string;
  page_age?: string;
}

export interface SearchResponse {
  results: {
    web: SearchResult[];
  };
  metadata: {
    query: string;
    search_uuid: string;
    latency: number;
  };
}

export interface SearchOptions {
  limit?: number;
}

export class YouSearchAPI {
  private apiKey: string;
  private baseUrl = "https://api.ydc-index.io/v1";

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("You.com API key is required");
    }
    this.apiKey = apiKey;
  }

  /**
   * Search the web using You.com Search API
   * @param query - Search query string
   * @param options - Optional search parameters
   * @returns Search results with URLs, titles, descriptions, and snippets
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`You.com Search API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as SearchResponse;

    // Log response structure for debugging
    if (process.env.DEBUG) {
      console.log("API Response:", JSON.stringify(data, null, 2));
    }

    // Return limited results if specified
    const results = data?.results?.web || [];
    return options?.limit ? results.slice(0, options.limit) : results;
  }

  /**
   * Check if the API key is valid by making a test request
   */
  async validate(): Promise<boolean> {
    try {
      await this.search("test", { limit: 1 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create a search client with timeout support
 * @param apiKey - You.com API key
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 */
export function createSearchClient(apiKey: string, timeoutMs = 5000): YouSearchAPI {
  const client = new YouSearchAPI(apiKey);

  // Wrap the search method with timeout
  const originalSearch = client.search.bind(client);
  client.search = async (query: string, options?: SearchOptions): Promise<SearchResult[]> => {
    return Promise.race([
      originalSearch(query, options),
      new Promise<SearchResult[]>((_, reject) => {
        globalThis.setTimeout(() => reject(new Error("Search request timed out")), timeoutMs);
      }),
    ]);
  };

  return client;
}
