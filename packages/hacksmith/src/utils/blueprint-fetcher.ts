import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "smol-toml";
import type { BlueprintConfig } from "../types/blueprint.js";
import { GitHubUrlUtils } from "./github-url-utils.js";
import { GitHubRepoService, type BlueprintFile } from "./github-repo-service.js";

export class BlueprintFetcher {
  static async fetchContent(blueprintPath: string): Promise<string> {
    if (blueprintPath.startsWith("http://") || blueprintPath.startsWith("https://")) {
      return this.fetchFromUrl(blueprintPath);
    } else {
      return this.fetchFromFile(blueprintPath);
    }
  }

  private static async fetchFromUrl(url: string): Promise<string> {
    let fetchUrl = url;

    // Handle GitHub blob URLs - convert to raw URLs
    if (GitHubUrlUtils.isGitHubBlobUrl(url)) {
      fetchUrl = GitHubUrlUtils.convertBlobToRaw(url);
    }

    // Handle GitHub repository URLs - provide helpful error
    if (GitHubUrlUtils.isGitHubRepoUrl(url)) {
      const repoInfo = GitHubUrlUtils.parseRepoInfo(url);
      throw new Error(
        `URL points to a GitHub repository, not a specific file. Use --github ${repoInfo?.owner}/${repoInfo?.repo} to list available blueprint files.`
      );
    }

    // eslint-disable-next-line no-undef
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch blueprint from ${fetchUrl}: ${response.statusText}`);
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

  static async listBlueprintsFromRepo(repoInput: string): Promise<BlueprintFile[]> {
    return GitHubRepoService.listBlueprintsFromInput(repoInput);
  }
}
