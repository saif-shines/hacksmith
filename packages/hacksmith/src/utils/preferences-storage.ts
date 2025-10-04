import Conf from "conf";
import { homedir } from "os";
import { join } from "path";
import type { PreferencesSchema, AIAgentPreference } from "../types/preferences.js";
import type { TechStack } from "./tech-stack-detector.js";

class PreferencesStorage {
  private config: Conf<PreferencesSchema>;

  constructor() {
    this.config = new Conf<PreferencesSchema>({
      configName: "preferences",
      cwd: join(homedir(), ".hacksmith"),
      defaults: {},
      schema: {
        ai_agent: {
          type: "object",
          properties: {
            provider: {
              type: "string",
              enum: ["claude-code", "gh-copilot", "gemini", "none"],
            },
            cli_path: { type: "string" },
            version: { type: "string" },
            updated_at: { type: "string" },
          },
          required: ["provider", "cli_path", "updated_at"],
        },
        tech_stack: {
          type: "object",
          properties: {
            technologies: { type: "array" },
            languages: { type: "object" },
            dependencies: { type: "object" },
            frameworks: { type: "array" },
            scannedAt: { type: "string" },
            projectPath: { type: "string" },
          },
          required: [
            "technologies",
            "languages",
            "dependencies",
            "frameworks",
            "scannedAt",
            "projectPath",
          ],
        },
      },
    });
  }

  /**
   * Save AI agent preference
   */
  saveAIAgent(preference: AIAgentPreference): void {
    this.config.set("ai_agent", preference);
  }

  /**
   * Get AI agent preference
   */
  getAIAgent(): AIAgentPreference | undefined {
    return this.config.get("ai_agent");
  }

  /**
   * Check if AI agent is configured
   */
  hasAIAgent(): boolean {
    const agent = this.getAIAgent();
    return agent !== undefined && agent.provider !== "none";
  }

  /**
   * Clear AI agent preference
   */
  clearAIAgent(): void {
    this.config.delete("ai_agent");
  }

  /**
   * Save tech stack
   */
  saveTechStack(techStack: TechStack): void {
    this.config.set("tech_stack", techStack);
  }

  /**
   * Get tech stack
   */
  getTechStack(): TechStack | undefined {
    return this.config.get("tech_stack");
  }

  /**
   * Clear tech stack
   */
  clearTechStack(): void {
    this.config.delete("tech_stack");
  }

  /**
   * Clear all preferences
   */
  clear(): void {
    this.config.clear();
  }

  /**
   * Get preferences file path
   */
  getPath(): string {
    return this.config.path;
  }
}

// Singleton instance
export const preferences = new PreferencesStorage();
