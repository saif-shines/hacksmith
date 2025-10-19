import { GitHubUrlUtils, type GitHubRepoInfo } from "@/utils/github-url-utils.js";
import { BaseBlueprintSource, type BlueprintOption } from "./base-source.js";
import { promisify } from "node:util";
import { exec as execCb } from "node:child_process";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";

const execAsync = promisify(execCb);

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers["Authorization"] = `token ${token}`;
  return headers;
}

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
    // Handle GitHub blob URLs - prefer Contents API with auth (supports private repos)
    if (GitHubUrlUtils.isGitHubBlobUrl(input)) {
      const info = GitHubUrlUtils.parseRepoInfo(input);
      if (!info || !info.branch || !info.path) {
        throw new Error(`Invalid GitHub blob URL: ${input}`);
      }

      const contentsUrl = GitHubUrlUtils.buildFileContentsUrl(
        info.owner,
        info.repo,
        info.path,
        info.branch
      );

      // Try Contents API with auth first
      const headers = getAuthHeaders();
      const contentsResp = await fetch(contentsUrl, { headers });
      if (contentsResp.ok) {
        const data = (await contentsResp.json()) as { content?: string; encoding?: string };
        if (data.content && data.encoding === "base64") {
          return Buffer.from(data.content, "base64").toString("utf-8");
        }
        // If content field not present, fallback to raw
      } else if (contentsResp.status === 404 || contentsResp.status === 403) {
        // If unauthorized or not found via API, we'll try raw as a fallback
      } else {
        throw new Error(
          `Failed to fetch file via GitHub API: ${contentsResp.status} ${contentsResp.statusText}`
        );
      }

      // Fallback to raw URL fetch (may work for public repos)
      const rawUrl = GitHubUrlUtils.convertBlobToRaw(input);
      const rawResp = await fetch(rawUrl, { headers });
      if (!rawResp.ok) {
        const hint = process.env.GITHUB_TOKEN
          ? ""
          : " Set GITHUB_TOKEN to access private repositories.";
        throw new Error(`Failed to fetch blueprint from ${rawUrl}: ${rawResp.statusText}.${hint}`);
      }
      return await rawResp.text();
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
    // Prefer Trees API (recursive); fallback to git clone if needed
    const headers = getAuthHeaders();

    // Determine ref/branch
    let ref = repoInfo.branch;
    try {
      if (!ref) {
        const repoMetaUrl = GitHubUrlUtils.buildRepoMetaUrl(repoInfo.owner, repoInfo.repo);
        const metaResp = await fetch(repoMetaUrl, { headers });
        if (!metaResp.ok) {
          if (metaResp.status === 404 || metaResp.status === 403) {
            // Possibly private or missing auth; fallback to git
            return await this.listTomlFilesViaGit(repoInfo);
          }
          throw new Error(`Failed to fetch repo metadata: ${metaResp.statusText}`);
        }
        const meta = (await metaResp.json()) as { default_branch?: string };
        ref = meta.default_branch || "main";
      }

      const treeUrl = GitHubUrlUtils.buildTreeUrl(repoInfo.owner, repoInfo.repo, ref);
      const treeResp = await fetch(treeUrl, { headers });
      if (!treeResp.ok) {
        if (treeResp.status === 404 || treeResp.status === 403) {
          return await this.listTomlFilesViaGit({ ...repoInfo, branch: ref });
        }
        throw new Error(`Failed to fetch repository tree: ${treeResp.statusText}`);
      }

      const treeData = (await treeResp.json()) as {
        tree?: Array<{ path: string; type: string }>;
        truncated?: boolean;
      };

      if (treeData.truncated) {
        // For very large repos, fallback to git for completeness
        return await this.listTomlFilesViaGit({ ...repoInfo, branch: ref });
      }

      const toml = (treeData.tree || [])
        .filter((n) => n.type === "blob" && n.path.endsWith(".toml"))
        .map((n) => ({
          name: n.path,
          path: n.path,
          // Return blob URLs so fetchContent can handle auth/contents API
          url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${ref}/${n.path}`,
        }));

      if (toml.length === 0) {
        throw new Error(
          `No .toml files found in repository ${repoInfo.owner}/${repoInfo.repo} (searched recursively)`
        );
      }

      return toml;
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error(`Failed to list repository files: ${String(error)}`);
    }
  }

  private async listTomlFilesViaGit(repoInfo: GitHubRepoInfo): Promise<BlueprintOption[]> {
    // Shallow clone and list toml files; cleanup afterwards
    const branch = repoInfo.branch || "main";
    const tmpBase = tmpdir();
    const tmp = mkdtempSync(join(tmpBase, `hacksmith-${repoInfo.owner}-${repoInfo.repo}-`));
    const token = process.env.GITHUB_TOKEN;
    // Use authenticated URL if token present (supports private repos)
    // Note: do NOT log this URL to avoid leaking credentials
    const cloneUrl = token
      ? `https://x-access-token:${encodeURIComponent(token)}@github.com/${repoInfo.owner}/${repoInfo.repo}.git`
      : `https://github.com/${repoInfo.owner}/${repoInfo.repo}.git`;

    try {
      // Ensure git exists
      await execAsync("git --version");

      // Shallow clone
      await execAsync(`git clone --depth 1 --branch ${branch} ${cloneUrl} ${tmp}`);

      // List tracked files and filter toml
      const { stdout } = await execAsync("git ls-files", { cwd: tmp });
      const paths = stdout
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.endsWith(".toml"));

      return paths.map((p) => ({
        name: p,
        path: p,
        url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${branch}/${p}`,
      }));
    } catch (err) {
      const tokenNote = process.env.GITHUB_TOKEN
        ? ""
        : " You may set GITHUB_TOKEN to enable API listing for private repositories.";
      const gitNote =
        err instanceof Error && /git\s+not\s+found/i.test(err.message)
          ? " Git not found. Install Git or provide GITHUB_TOKEN."
          : "";
      // Mask token if it accidentally appears in the error message
      const rawMsg = (err as Error).message || String(err);
      const maskedMsg = token ? rawMsg.replaceAll(token, "***") : rawMsg;
      throw new Error(
        `Failed to list repository files via git clone: ${maskedMsg}.${gitNote}${tokenNote}`
      );
    } finally {
      // Cleanup temp directory
      try {
        rmSync(tmp, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
