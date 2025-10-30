/**
 * Context Enricher Service
 * Enriches mission brief content using You.com Search API
 */

import { YouSearchAPI, type SearchResult } from "@/utils/you-api-client.js";
import { log } from "@clack/prompts";

export interface IntegrationGuide {
  title: string;
  url: string;
  description: string;
}

export interface DependencyContext {
  name: string;
  version: string;
  resources: {
    title: string;
    url: string;
    description: string;
  }[];
}

export interface EnrichedContext {
  integrationGuides: IntegrationGuide[];
  dependencyContext: DependencyContext[];
}

export class ContextEnricher {
  private searchAPI: YouSearchAPI;

  constructor(apiKey: string) {
    this.searchAPI = new YouSearchAPI(apiKey);
  }

  /**
   * Enrich mission brief with integration guides
   * @param blueprintName - Name of the blueprint (e.g., "Scalekit SSO")
   * @param frameworks - List of detected frameworks (e.g., ["React", "Next.js"])
   * @returns Integration guides with URLs and descriptions
   */
  async enrichIntegrationGuides(
    blueprintName?: string,
    frameworks: string[] = []
  ): Promise<IntegrationGuide[]> {
    if (!blueprintName || frameworks.length === 0) {
      return [];
    }

    const guides: IntegrationGuide[] = [];

    try {
      // Search for each framework integration
      for (const framework of frameworks.slice(0, 2)) {
        // Limit to 2 frameworks
        const query = `${blueprintName} ${framework} integration guide`;
        log.info(`Searching: "${query}"`);

        const results = await this.searchAPI.search(query, { limit: 3 });

        results.forEach((result) => {
          guides.push({
            title: result.title,
            url: result.url,
            description: result.description,
          });
        });
      }

      // Also search for general product guides
      if (guides.length < 3) {
        const query = `${blueprintName} quickstart guide tutorial`;
        log.info(`Searching: "${query}"`);

        const results = await this.searchAPI.search(query, { limit: 3 });

        results.forEach((result) => {
          // Avoid duplicates
          if (!guides.some((g) => g.url === result.url)) {
            guides.push({
              title: result.title,
              url: result.url,
              description: result.description,
            });
          }
        });
      }

      return guides.slice(0, 5); // Return top 5 guides
    } catch (error) {
      log.warn(`Failed to enrich integration guides: ${error}`);
      return [];
    }
  }

  /**
   * Enrich dependency information with breaking changes and migration guides
   * @param dependencies - Map of dependency names to versions
   * @returns Dependency context with resources
   */
  async enrichDependencyContext(
    dependencies: Record<string, string>
  ): Promise<DependencyContext[]> {
    const context: DependencyContext[] = [];

    try {
      // Get top 5 dependencies (most likely to be important)
      const topDeps = Object.entries(dependencies).slice(0, 5);

      for (const [name, version] of topDeps) {
        // Search for breaking changes and migration guides
        const query = `${name} ${version} breaking changes migration guide`;
        log.info(`Searching: "${query}"`);

        const results = await this.searchAPI.search(query, { limit: 3 });

        if (results.length > 0) {
          context.push({
            name,
            version,
            resources: results.map((result) => ({
              title: result.title,
              url: result.url,
              description: result.description,
            })),
          });
        }
      }

      return context;
    } catch (error) {
      log.warn(`Failed to enrich dependency context: ${error}`);
      return [];
    }
  }

  /**
   * Enrich context with both integration guides and dependency context
   * @param blueprintName - Name of the blueprint
   * @param frameworks - List of detected frameworks
   * @param dependencies - Map of dependency names to versions
   * @returns Enriched context with guides and dependency info
   */
  async enrich(
    blueprintName?: string,
    frameworks: string[] = [],
    dependencies: Record<string, string> = {}
  ): Promise<EnrichedContext> {
    log.info("🔍 Enriching mission brief with You.com API...");

    const [integrationGuides, dependencyContext] = await Promise.all([
      this.enrichIntegrationGuides(blueprintName, frameworks),
      this.enrichDependencyContext(dependencies),
    ]);

    return {
      integrationGuides,
      dependencyContext,
    };
  }
}

/**
 * Helper function to convert search result to a markdown link
 */
export function formatAsMarkdownLink(result: IntegrationGuide | SearchResult): string {
  const title = "title" in result ? result.title : "";
  const url = "url" in result ? result.url : "";
  return `[${title}](${url})`;
}
