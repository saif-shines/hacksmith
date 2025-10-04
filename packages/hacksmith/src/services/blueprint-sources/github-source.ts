import { GitHubUrlUtils, type GitHubRepoInfo } from "../../utils/github-url-utils.js";
import { BaseBlueprintSource, type BlueprintOption } from "./base-source.js";

export class GitHubSource extends BaseBlueprintSource {
  readonly name = "github";

  canHandle(input: string): boolean {
    // Handle GitHub URLs and owner/repo format
    return (
      GitHubUrlUtils.isGitHubBlobUrl(input) ||
      GitHubUrlUtils.isGitHubRepoUrl(input) ||
      GitHubUrlUtils.isOwnerRepoFormat(input)
    );
  }

  async fetchContent(input: string): Promise<string> {
    // Handle GitHub blob URLs - convert to raw URLs
    if (GitHubUrlUtils.isGitHubBlobUrl(input)) {
      const rawUrl = GitHubUrlUtils.convertBlobToRaw(input);
      const response = await fetch(rawUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch blueprint from ${rawUrl}: ${response.statusText}`);
      }
      return await response.text();
    }

    // Handle GitHub repository URLs - provide helpful error
    if (GitHubUrlUtils.isGitHubRepoUrl(input)) {
      const repoInfo = GitHubUrlUtils.parseRepoInfo(input);
      throw new Error(
        `URL points to a GitHub repository, not a specific file. Use --github ${repoInfo?.owner}/${repoInfo?.repo} to list available blueprint files.`
      );
    }

    throw new Error(`Cannot fetch content directly from repository format: ${input}`);
  }

  async listAvailable(input: string): Promise<BlueprintOption[]> {
    const repoInfo = GitHubUrlUtils.parseRepoInfo(input);
    if (!repoInfo) {
      throw new Error(`Invalid GitHub repository format: ${input}`);
    }

    // For blob URLs, we shouldn't list files - they're pointing to a specific file
    if (GitHubUrlUtils.isGitHubBlobUrl(input)) {
      throw new Error(
        `URL points to a specific file. Use direct fetching for file URLs or provide repository URL for listing files.`
      );
    }

    return this.listTomlFiles(repoInfo);
  }

  private async listTomlFiles(repoInfo: GitHubRepoInfo): Promise<BlueprintOption[]> {
    try {
      const apiUrl = GitHubUrlUtils.buildApiUrl(repoInfo.owner, repoInfo.repo);
      const response = await fetch(apiUrl);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Repository ${repoInfo.owner}/${repoInfo.repo} not found or is private`);
        }
        throw new Error(`Failed to fetch repository contents: ${response.statusText}`);
      }

      const files = (await response.json()) as Array<{
        name: string;
        path: string;
        type: "file" | "dir";
      }>;

      const tomlFiles = files
        .filter((file) => file.type === "file" && file.name.endsWith(".toml"))
        .map((file) => ({
          name: file.name,
          path: file.path,
          url: GitHubUrlUtils.buildRawUrl(
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
}
