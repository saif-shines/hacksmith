import type { BlueprintConfig } from "../types/blueprint.js";
import type { BlueprintSource, BlueprintOption } from "./blueprint-sources/base-source.js";
import { FileSource } from "./blueprint-sources/file-source.js";
import { HttpSource } from "./blueprint-sources/http-source.js";
import { GitHubSource } from "./blueprint-sources/github-source.js";

export class BlueprintService {
  private static sources: BlueprintSource[] = [
    new GitHubSource(), // Check GitHub first (more specific)
    new HttpSource(),
    new FileSource(),
  ];

  static getSourceForInput(input: string): BlueprintSource {
    const source = this.sources.find((s) => s.canHandle(input));
    if (!source) {
      throw new Error(`No source handler found for input: ${input}`);
    }
    return source;
  }

  static async load(input: string): Promise<BlueprintConfig> {
    const source = this.getSourceForInput(input);
    return source.load(input);
  }

  static async listAvailable(input: string): Promise<BlueprintOption[]> {
    const source = this.getSourceForInput(input);
    if (!source.listAvailable) {
      throw new Error(`Source ${source.name} does not support listing available blueprints`);
    }
    return source.listAvailable(input);
  }

  static canList(input: string): boolean {
    const source = this.getSourceForInput(input);
    return !!source.listAvailable;
  }
}
