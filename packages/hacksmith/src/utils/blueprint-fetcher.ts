import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "smol-toml";
import type { BlueprintConfig } from "../types/blueprint.js";

export class BlueprintFetcher {
  static async fetchContent(blueprintPath: string): Promise<string> {
    if (blueprintPath.startsWith("http://") || blueprintPath.startsWith("https://")) {
      return this.fetchFromUrl(blueprintPath);
    } else {
      return this.fetchFromFile(blueprintPath);
    }
  }

  private static async fetchFromUrl(url: string): Promise<string> {
    // eslint-disable-next-line no-undef
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blueprint from ${url}: ${response.statusText}`);
    }
    return await response.text();
  }

  private static async fetchFromFile(filePath: string): Promise<string> {
    const resolvedPath = resolve(filePath);
    return await readFile(resolvedPath, "utf-8");
  }

  static parseBlueprint(content: string): BlueprintConfig {
    try {
      return parse(content) as BlueprintConfig;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to parse blueprint TOML: ${err.message}`);
    }
  }

  static async load(blueprintPath: string): Promise<BlueprintConfig> {
    const content = await this.fetchContent(blueprintPath);
    return this.parseBlueprint(content);
  }
}
