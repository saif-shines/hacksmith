export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  branch?: string;
  path?: string;
}

export class GitHubUrlUtils {
  private static readonly GITHUB_BLOB_PATTERN =
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/;
  private static readonly GITHUB_REPO_PATTERN = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/;
  private static readonly OWNER_REPO_PATTERN = /^([^/]+)\/([^/]+)$/;

  static isGitHubBlobUrl(url: string): boolean {
    return this.GITHUB_BLOB_PATTERN.test(url);
  }

  static isGitHubRepoUrl(url: string): boolean {
    return this.GITHUB_REPO_PATTERN.test(url);
  }

  static isOwnerRepoFormat(input: string): boolean {
    return this.OWNER_REPO_PATTERN.test(input) && !input.includes("://");
  }

  static parseRepoInfo(input: string): GitHubRepoInfo | null {
    // Handle blob URLs: https://github.com/owner/repo/blob/branch/path
    const blobMatch = input.match(this.GITHUB_BLOB_PATTERN);
    if (blobMatch) {
      return {
        owner: blobMatch[1],
        repo: blobMatch[2],
        branch: blobMatch[3],
        path: blobMatch[4],
      };
    }

    // Handle repo URLs: https://github.com/owner/repo
    const repoMatch = input.match(this.GITHUB_REPO_PATTERN);
    if (repoMatch) {
      return {
        owner: repoMatch[1],
        repo: repoMatch[2],
      };
    }

    // Handle owner/repo format
    const ownerRepoMatch = input.match(this.OWNER_REPO_PATTERN);
    if (ownerRepoMatch && !input.includes("://")) {
      return {
        owner: ownerRepoMatch[1],
        repo: ownerRepoMatch[2],
      };
    }

    return null;
  }

  static convertBlobToRaw(blobUrl: string): string {
    const repoInfo = this.parseRepoInfo(blobUrl);
    if (!repoInfo || !repoInfo.branch || !repoInfo.path) {
      throw new Error(`Invalid GitHub blob URL: ${blobUrl}`);
    }

    return `https://raw.githubusercontent.com/${repoInfo.owner}/${repoInfo.repo}/refs/heads/${repoInfo.branch}/${repoInfo.path}`;
  }

  static buildRawUrl(owner: string, repo: string, branch: string, path: string): string {
    return `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/${branch}/${path}`;
  }

  static buildApiUrl(owner: string, repo: string, path?: string): string {
    const baseUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    return path ? `${baseUrl}/${path}` : baseUrl;
  }
}
