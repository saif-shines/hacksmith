import { BaseBlueprintSource } from "./base-source.js";

export class HttpSource extends BaseBlueprintSource {
  readonly name = "http";

  canHandle(input: string): boolean {
    // Handle HTTP URLs that are not GitHub URLs (those are handled by GitHubSource)
    return (
      (input.startsWith("http://") || input.startsWith("https://")) && !input.includes("github.com")
    );
  }

  async fetchContent(url: string): Promise<string> {
    // eslint-disable-next-line no-undef
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blueprint from ${url}: ${response.statusText}`);
    }
    return await response.text();
  }
}
