import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface DetectedAICLI {
  name: string;
  displayName: string;
  command: string;
  path: string;
  version?: string;
}

export type AICLIProvider = "claude-code" | "gh-copilot" | "gemini";

const AI_CLI_CONFIGS = [
  {
    name: "claude-code" as AICLIProvider,
    displayName: "Claude Code",
    commands: ["claude", "claude-code"],
    versionCommand: "claude --version",
  },
  {
    name: "gh-copilot" as AICLIProvider,
    displayName: "GitHub Copilot",
    commands: ["gh"],
    versionCommand: "gh copilot --version",
    requiresExtension: true,
  },
  {
    name: "gemini" as AICLIProvider,
    displayName: "Google Gemini",
    commands: ["gemini"],
    versionCommand: "gemini --version",
  },
];

export class AICLIDetector {
  /**
   * Detect all installed AI CLI tools
   */
  static async detectAll(): Promise<DetectedAICLI[]> {
    const detected: DetectedAICLI[] = [];

    for (const config of AI_CLI_CONFIGS) {
      const tool = await this.detectTool(config);
      if (tool) {
        detected.push(tool);
      }
    }

    return detected;
  }

  /**
   * Check if a specific AI CLI is installed
   */
  static async isInstalled(provider: AICLIProvider): Promise<boolean> {
    const config = AI_CLI_CONFIGS.find((c) => c.name === provider);
    if (!config) return false;

    const tool = await this.detectTool(config);
    return tool !== null;
  }

  /**
   * Detect a specific tool based on configuration
   */
  private static async detectTool(
    config: (typeof AI_CLI_CONFIGS)[0]
  ): Promise<DetectedAICLI | null> {
    // Try each command variant
    for (const command of config.commands) {
      const path = await this.which(command);
      if (path) {
        // For gh copilot, verify the extension is installed
        if (config.requiresExtension) {
          const hasExtension = await this.checkGHCopilotExtension();
          if (!hasExtension) continue;
        }

        // Try to get version
        let version: string | undefined;
        try {
          const { stdout } = await execAsync(config.versionCommand);
          version = this.parseVersion(stdout);
        } catch {
          // Version detection failed, but tool is installed
        }

        return {
          name: config.name,
          displayName: config.displayName,
          command,
          path,
          version,
        };
      }
    }

    return null;
  }

  /**
   * Find command path using which/where
   */
  private static async which(command: string): Promise<string | null> {
    try {
      const isWindows = process.platform === "win32";
      const whichCommand = isWindows ? "where" : "which";

      const { stdout } = await execAsync(`${whichCommand} ${command}`);
      const path = stdout.trim().split("\n")[0]; // Get first result on Windows

      return path || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if GitHub Copilot CLI extension is installed
   */
  private static async checkGHCopilotExtension(): Promise<boolean> {
    try {
      const { stdout } = await execAsync("gh extension list");
      return stdout.includes("copilot");
    } catch {
      return false;
    }
  }

  /**
   * Parse version from command output
   */
  private static parseVersion(output: string): string | undefined {
    // Try to extract version number (e.g., "1.2.3" or "v1.2.3")
    const match = output.match(/v?(\d+\.\d+\.\d+)/);
    return match ? match[1] : undefined;
  }
}
