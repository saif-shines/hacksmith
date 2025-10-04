import { spawn } from "child_process";
import { preferences } from "./preferences-storage.js";
import type { AIAgentPreference } from "../types/preferences.js";

export interface AIAgentInvokeOptions {
  missionBriefPath: string;
  workingDirectory?: string;
  additionalContext?: string;
}

export class AIAgentInvoker {
  /**
   * Invoke the configured AI agent with the mission brief
   */
  static async invoke(options: AIAgentInvokeOptions): Promise<void> {
    const aiAgent = preferences.getAIAgent();

    if (!aiAgent || aiAgent.provider === "none") {
      throw new Error("No AI agent configured. Run 'hacksmith preferences setup' first.");
    }

    const command = this.buildCommand(aiAgent, options);

    return new Promise((resolve, reject) => {
      // Don't use shell: true to avoid quote escaping issues
      const child = spawn(command.cmd, command.args, {
        cwd: options.workingDirectory || process.cwd(),
        stdio: "inherit",
      });

      child.on("error", (error) => {
        reject(new Error(`Failed to invoke ${aiAgent.provider}: ${error.message}`));
      });

      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${aiAgent.provider} exited with code ${code}`));
        }
      });
    });
  }

  /**
   * Build the command to invoke the AI agent
   */
  private static buildCommand(
    aiAgent: AIAgentPreference,
    options: AIAgentInvokeOptions
  ): { cmd: string; args: string[] } {
    switch (aiAgent.provider) {
      case "claude-code":
        return this.buildClaudeCodeCommand(aiAgent, options);
      case "gh-copilot":
        return this.buildGitHubCopilotCommand(aiAgent, options);
      case "gemini":
        return this.buildGeminiCommand(aiAgent, options);
      default:
        throw new Error(`Unsupported AI provider: ${aiAgent.provider}`);
    }
  }

  /**
   * Build Claude Code command
   */
  private static buildClaudeCodeCommand(
    aiAgent: AIAgentPreference,
    options: AIAgentInvokeOptions
  ): { cmd: string; args: string[] } {
    // Use initial prompt - Claude Code will use Read tool to access the mission brief
    const prompt = `Please read and review the mission brief at ${options.missionBriefPath} and help me implement the integration steps outlined in it.`;

    return {
      cmd: aiAgent.cli_path,
      args: [prompt],
    };
  }

  /**
   * Build GitHub Copilot command
   */
  private static buildGitHubCopilotCommand(
    aiAgent: AIAgentPreference,
    options: AIAgentInvokeOptions
  ): { cmd: string; args: string[] } {
    // gh copilot doesn't support file context the same way
    // We'll just open it with a prompt to review the file
    const prompt = `Please review the mission brief at ${options.missionBriefPath} and help me implement the next steps.`;

    return {
      cmd: aiAgent.cli_path,
      args: ["copilot", "suggest", prompt],
    };
  }

  /**
   * Build Gemini command
   */
  private static buildGeminiCommand(
    aiAgent: AIAgentPreference,
    options: AIAgentInvokeOptions
  ): { cmd: string; args: string[] } {
    // Gemini CLI usage
    const prompt = this.buildPrompt(options);

    return {
      cmd: aiAgent.cli_path,
      args: ["--file", options.missionBriefPath, prompt],
    };
  }

  /**
   * Build the prompt for the AI agent
   */
  private static buildPrompt(options: AIAgentInvokeOptions): string {
    const parts: string[] = [];

    parts.push("I've just completed the integration setup using Hacksmith CLI.");
    parts.push(
      "Please review the mission brief (included) which contains the tech stack context and blueprint execution summary."
    );
    parts.push("Help me implement the next steps for this integration.");

    if (options.additionalContext) {
      parts.push("");
      parts.push("Additional context:");
      parts.push(options.additionalContext);
    }

    return parts.join(" ");
  }

  /**
   * Check if AI agent is configured and ready
   */
  static isConfigured(): boolean {
    const aiAgent = preferences.getAIAgent();
    return aiAgent !== undefined && aiAgent.provider !== "none";
  }

  /**
   * Get the configured AI agent name for display
   */
  static getConfiguredAgentName(): string | null {
    const aiAgent = preferences.getAIAgent();
    if (!aiAgent || aiAgent.provider === "none") {
      return null;
    }

    const displayNames: Record<string, string> = {
      "claude-code": "Claude Code",
      "gh-copilot": "GitHub Copilot",
      gemini: "Google Gemini",
    };

    return displayNames[aiAgent.provider] || aiAgent.provider;
  }
}
