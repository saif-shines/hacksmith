import type { AICLIProvider } from "../utils/ai-cli-detector.js";
import type { TechStack } from "../utils/tech-stack-detector.js";

export interface AIAgentPreference {
  provider: AICLIProvider | "none";
  cli_path: string;
  version?: string;
  updated_at: string;
}

export interface PreferencesSchema {
  ai_agent?: AIAgentPreference;
  tech_stack?: TechStack;
}
