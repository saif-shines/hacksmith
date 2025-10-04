import { GitHubUrlUtils, type GitHubRepoInfo } from "./github-url-utils.js";

export interface GitHubFile {
  name: string;
  path: string;
  type: "file" | "dir";
  downloadUrl?: string;
}

export interface BlueprintFile {
  name: string;
  path: string;
  rawUrl: string;
}

export class GitHubRepoService {
  static async listTomlFiles(repoInfo: GitHubRepoInfo): Promise<BlueprintFile[]> {
    try {
      const apiUrl = GitHubUrlUtils.buildApiUrl(repoInfo.owner, repoInfo.repo);
      const response = await fetch(apiUrl);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Repository ${repoInfo.owner}/${repoInfo.repo} not found or is private`);
        }
        throw new Error(`Failed to fetch repository contents: ${response.statusText}`);
      }

      const files = (await response.json()) as GitHubFile[];

      const tomlFiles = files
        .filter((file) => file.type === "file" && file.name.endsWith(".toml"))
        .map((file) => ({
          name: file.name,
          path: file.path,
          rawUrl: GitHubUrlUtils.buildRawUrl(
            repoInfo.owner,
            repoInfo.repo,
            repoInfo.branch || "main",
            file.path
          ),
        }));

      if (tomlFiles.length === 0) {
        throw new Error(`No .toml files found in repository ${repoInfo.owner}/${repoInfo.repo}`);
      }

      return tomlFiles;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to list repository files: ${String(error)}`);
    }
  }

  static async listBlueprintsFromInput(input: string): Promise<BlueprintFile[]> {
    const repoInfo = GitHubUrlUtils.parseRepoInfo(input);
    if (!repoInfo) {
      throw new Error(`Invalid GitHub repository format: ${input}`);
    }

    // For blob URLs, we shouldn't list files - they're pointing to a specific file
    if (GitHubUrlUtils.isGitHubBlobUrl(input)) {
      throw new Error(
        `URL points to a specific file. Use --blueprint for direct file URLs or provide repository URL for listing files.`
      );
    }

    return this.listTomlFiles(repoInfo);
  }
}
