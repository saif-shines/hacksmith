import type { AICLIProvider } from "../utils/ai-cli-detector.js";

export interface AIAgentPreference {
  provider: AICLIProvider | "none";
  cli_path: string;
  version?: string;
  updated_at: string;
}

export interface PreferencesSchema {
  ai_agent?: AIAgentPreference;
}
