import { existsSync, readFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { execSync } from "child_process";
import { createHash } from "crypto";

export interface ProjectInfo {
  root: string;
  name: string;
  hash: string;
  type: ProjectType;
  gitRemote?: string;
  packageName?: string;
}

export type ProjectType = "git" | "npm" | "directory";

export class ProjectDetector {
  /**
   * Detect project root starting from given directory
   */
  static detectProject(startPath: string = process.cwd()): ProjectInfo | null {
    const projectRoot = this.findProjectRoot(startPath);
    if (!projectRoot) return null;

    const projectInfo = this.analyzeProject(projectRoot);
    return projectInfo;
  }

  /**
   * Find project root by walking up directory tree
   */
  private static findProjectRoot(startPath: string): string | null {
    let currentPath = resolve(startPath);

    while (currentPath !== dirname(currentPath)) {
      // Check for git repository
      if (existsSync(join(currentPath, ".git"))) {
        return currentPath;
      }

      // Check for package.json
      if (existsSync(join(currentPath, "package.json"))) {
        return currentPath;
      }

      // Check for other common project markers
      const projectMarkers = [
        "Cargo.toml", // Rust
        "go.mod", // Go
        "pyproject.toml", // Python
        "pom.xml", // Java Maven
        "build.gradle", // Java Gradle
        ".project", // Eclipse
        "composer.json", // PHP
      ];

      if (projectMarkers.some((marker) => existsSync(join(currentPath, marker)))) {
        return currentPath;
      }

      currentPath = dirname(currentPath);
    }

    return null;
  }

  /**
   * Analyze project to gather metadata
   */
  private static analyzeProject(projectRoot: string): ProjectInfo {
    const projectName = this.getProjectName(projectRoot);
    const gitRemote = this.getGitRemote(projectRoot);
    const packageName = this.getPackageName(projectRoot);

    // Determine project type
    let type: ProjectType = "directory";
    if (gitRemote) type = "git";
    else if (packageName) type = "npm";

    // Generate stable hash for project identification
    const hash = this.generateProjectHash(projectRoot, gitRemote, packageName);

    return {
      root: projectRoot,
      name: projectName,
      hash,
      type,
      gitRemote,
      packageName,
    };
  }

  /**
   * Get project name from various sources
   */
  private static getProjectName(projectRoot: string): string {
    // Try package.json first
    const packageJsonPath = join(projectRoot, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
        if (packageJson.name) {
          return packageJson.name;
        }
      } catch {
        // Ignore package.json parsing errors
      }
    }

    // Try Cargo.toml
    const cargoTomlPath = join(projectRoot, "Cargo.toml");
    if (existsSync(cargoTomlPath)) {
      try {
        const cargoContent = readFileSync(cargoTomlPath, "utf-8");
        const nameMatch = cargoContent.match(/name\s*=\s*"([^"]+)"/);
        if (nameMatch) {
          return nameMatch[1];
        }
      } catch {
        // Ignore Cargo.toml parsing errors
      }
    }

    // Fallback to directory name
    return projectRoot.split("/").pop() || "unknown-project";
  }

  /**
   * Get git remote URL if available
   */
  private static getGitRemote(projectRoot: string): string | undefined {
    try {
      const gitDir = join(projectRoot, ".git");
      if (!existsSync(gitDir)) return undefined;

      const remoteUrl = execSync("git remote get-url origin", {
        cwd: projectRoot,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();

      // Normalize GitHub URLs
      return this.normalizeGitUrl(remoteUrl);
    } catch {
      return undefined;
    }
  }

  /**
   * Normalize git URLs for consistent hashing
   */
  private static normalizeGitUrl(url: string): string {
    // Convert SSH to HTTPS for consistency
    if (url.startsWith("git@github.com:")) {
      return url.replace("git@github.com:", "https://github.com/").replace(".git", "");
    }

    // Remove .git suffix
    if (url.endsWith(".git")) {
      return url.slice(0, -4);
    }

    return url;
  }

  /**
   * Get package name from package.json
   */
  private static getPackageName(projectRoot: string): string | undefined {
    try {
      const packageJsonPath = join(projectRoot, "package.json");
      if (!existsSync(packageJsonPath)) return undefined;

      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      return packageJson.name;
    } catch {
      return undefined;
    }
  }

  /**
   * Generate stable project hash for identification
   */
  private static generateProjectHash(
    projectRoot: string,
    gitRemote?: string,
    packageName?: string
  ): string {
    let identifier: string;

    if (gitRemote) {
      // Use git remote as primary identifier for consistency across clones
      const repoName = gitRemote.split("/").pop() || "unknown";
      identifier = `${gitRemote}:${repoName}`;
    } else if (packageName) {
      // Use package name + path for npm projects without git
      identifier = `${packageName}:${projectRoot}`;
    } else {
      // Fallback to path-based identifier
      const projectName = projectRoot.split("/").pop() || "unknown";
      identifier = `${projectName}:${projectRoot}`;
    }

    return createHash("sha256").update(identifier).digest("hex").slice(0, 16);
  }

  /**
   * Check if current directory is within a project
   */
  static isInProject(path: string = process.cwd()): boolean {
    return this.findProjectRoot(path) !== null;
  }

  /**
   * Get project-local .hacksmith directory path
   */
  static getProjectHacksmithDir(projectRoot?: string): string | null {
    const project = projectRoot ? this.analyzeProject(projectRoot) : this.detectProject();

    if (!project) return null;

    return join(project.root, ".hacksmith");
  }
}
