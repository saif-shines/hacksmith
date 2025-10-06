import { parse } from "smol-toml";
import type { BlueprintConfig } from "@/types/blueprint.js";

export interface BlueprintSource {
  name: string;
  canHandle(input: string): boolean;
  fetchContent(input: string): Promise<string>;
  load(input: string): Promise<BlueprintConfig>;
  listAvailable?(input: string): Promise<BlueprintOption[]>;
}

export interface BlueprintOption {
  name: string;
  path: string;
  url: string;
  description?: string;
}

export abstract class BaseBlueprintSource implements BlueprintSource {
  abstract readonly name: string;
  abstract canHandle(input: string): boolean;
  abstract fetchContent(input: string): Promise<string>;

  listAvailable?(input: string): Promise<BlueprintOption[]>;

  protected parseBlueprint(content: string): BlueprintConfig {
    try {
      return parse(content) as BlueprintConfig;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to parse blueprint TOML: ${err.message}`);
    }
  }

  async load(input: string): Promise<BlueprintConfig> {
    const content = await this.fetchContent(input);
    return this.parseBlueprint(content);
  }
}
