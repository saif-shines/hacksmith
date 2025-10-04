import { select, confirm, outro } from "@clack/prompts";
import chalk from "chalk";
import figures from "figures";
import { Command, CommandContext } from "../types/command.js";
import { AICLIDetector, type DetectedAICLI, type AICLIProvider } from "../utils/ai-cli-detector.js";
import { preferences } from "../utils/preferences-storage.js";

export class PreferencesCommand extends Command {
  name = "preferences";
  description = "Manage Hacksmith preferences";
  aliases = ["prefs"];

  async execute(args: string[], context: CommandContext): Promise<void> {
    const subcommand = args[0];

    switch (subcommand) {
      case "show":
        await this.showPreferences(context);
        break;
      case "reset":
        await this.resetPreferences(context);
        break;
      case undefined:
      case "setup":
        await this.setupPreferences(context);
        break;
      default:
        context.error(`Unknown subcommand: ${subcommand}`);
        context.output("Usage: hacksmith preferences [show|reset|setup]");
    }
  }

  /**
   * Interactive AI agent setup
   */
  private async setupPreferences(context: CommandContext): Promise<void> {
    context.output(chalk.cyan.bold("\n✨ Let's set up your AI agent preferences\n"));

    // Detect installed AI CLIs
    const s = context.spinner;
    s.start("Scanning for installed AI CLIs...");

    const detected = await AICLIDetector.detectAll();
    s.stop("Scan complete");

    if (detected.length === 0) {
      context.output(
        chalk.yellow(
          `\n${figures.warning} No AI CLIs detected.\n\nInstall one of the following:\n` +
            `  • Claude Code: https://claude.com/claude-code\n` +
            `  • GitHub Copilot: gh extension install copilot\n` +
            `  • Google Gemini: (installation link)\n`
        )
      );
      return;
    }

    // Show detected tools
    context.output(chalk.green(`\n${figures.tick} Found ${detected.length} AI CLI(s):\n`));
    detected.forEach((tool) => {
      const version = tool.version ? chalk.gray(`v${tool.version}`) : "";
      context.output(`  ${figures.pointer} ${chalk.bold(tool.displayName)} ${version}`);
      context.output(chalk.gray(`    ${tool.path}`));
    });

    // If only one detected, ask to confirm
    if (detected.length === 1) {
      const tool = detected[0];
      const shouldUse = await confirm({
        message: `Use ${tool.displayName} as your AI agent?`,
        initialValue: true,
      });

      if (typeof shouldUse === "symbol" || !shouldUse) {
        context.output(chalk.gray("\nSetup cancelled"));
        return;
      }

      this.savePreference(tool);
      return;
    }

    // Multiple tools detected, show selection menu
    const selected = await select({
      message: "Which AI agent would you like to use?",
      options: detected.map((tool) => ({
        value: tool.name,
        label: tool.displayName,
        hint: tool.version ? `v${tool.version}` : undefined,
      })),
    });

    if (typeof selected === "symbol") {
      context.output(chalk.gray("\nSetup cancelled"));
      return;
    }

    const tool = detected.find((t) => t.name === selected);
    if (tool) {
      this.savePreference(tool);
    }
  }

  /**
   * Save AI agent preference
   */
  private savePreference(tool: DetectedAICLI): void {
    preferences.saveAIAgent({
      provider: tool.name as AICLIProvider,
      cli_path: tool.path,
      version: tool.version,
      updated_at: new Date().toISOString(),
    });

    outro(
      chalk.green(`${figures.tick} Saved! You're all set to use ${chalk.bold(tool.displayName)}`)
    );
  }

  /**
   * Show current preferences
   */
  private async showPreferences(context: CommandContext): Promise<void> {
    const agent = preferences.getAIAgent();

    if (!agent || agent.provider === "none") {
      context.output(
        chalk.yellow(
          `\n${figures.warning} No AI agent configured.\n\nRun: ${chalk.cyan("hacksmith preferences")} to set up`
        )
      );
      return;
    }

    const updatedAt = new Date(agent.updated_at);
    const timeAgo = this.getTimeAgo(updatedAt);

    context.output(chalk.cyan.bold("\n📋 Current Preferences\n"));
    context.output(`${chalk.green(figures.tick)} AI Agent: ${chalk.bold(agent.provider)}`);
    context.output(`${chalk.green(figures.tick)} Path: ${agent.cli_path}`);
    if (agent.version) {
      context.output(`${chalk.green(figures.tick)} Version: ${agent.version}`);
    }
    context.output(`${chalk.green(figures.tick)} Last updated: ${timeAgo}\n`);
  }

  /**
   * Reset all preferences
   */
  private async resetPreferences(context: CommandContext): Promise<void> {
    const shouldReset = await confirm({
      message: "Reset all preferences?",
      initialValue: false,
    });

    if (typeof shouldReset === "symbol" || !shouldReset) {
      context.output(chalk.gray("Reset cancelled"));
      return;
    }

    preferences.clear();
    outro(chalk.green(`${figures.tick} Preferences reset successfully`));
  }

  /**
   * Get human-readable time ago string
   */
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

    return date.toLocaleDateString();
  }
}
