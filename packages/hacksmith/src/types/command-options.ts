export interface CommandOption {
  short: string;
  long: string;
  description: string;
  hasValue?: boolean;
}

export interface CommandDefinition {
  name: string;
  description: string;
  aliases?: string[];
  options: CommandOption[];
}

export const PLAN_COMMAND_DEFINITION: CommandDefinition = {
  name: "plan",
  description: "Generate and manage integration plans",
  aliases: ["p"],
  options: [
    {
      short: "b",
      long: "blueprint",
      description: "Path to blueprint TOML file (local path or HTTP URL)",
      hasValue: true,
    },
    {
      short: "g",
      long: "github",
      description: "GitHub repository (owner/repo format)",
      hasValue: true,
    },
    {
      short: "j",
      long: "json",
      description: "Output only JSON format",
      hasValue: false,
    },
    {
      short: "h",
      long: "help",
      description: "Show help",
      hasValue: false,
    },
  ],
};
