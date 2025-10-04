import { select, confirm, outro } from "@clack/prompts";
import chalk from "chalk";
import figures from "figures";
import { Command, CommandContext } from "../types/command.js";
import { AICLIDetector, type DetectedAICLI, type AICLIProvider } from "../utils/ai-cli-detector.js";
import { preferences } from "../utils/preferences-storage.js";
import { TechStackDetector } from "../utils/tech-stack-detector.js";

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
      case "scan":
        await this.scanTechStack(context);
        break;
      case undefined:
      case "setup":
        await this.setupPreferences(context);
        break;
      default:
        context.error(`Unknown subcommand: ${subcommand}`);
        context.output("Usage: hacksmith preferences [show|reset|setup|scan]");
    }
  }

  /**
   * Interactive AI agent setup
   */
  private async setupPreferences(context: CommandContext): Promise<void> {
    context.output(chalk.cyan.bold("\n✨ Let's set up your preferences\n"));

    // Step 1: AI Agent Setup
    context.output(chalk.bold("Step 1: AI Agent Configuration\n"));

    // Detect installed AI CLIs
    const s = context.spinner;
    s.start("Scanning for installed AI CLIs...");

    const detected = await AICLIDetector.detectAll();
    s.stop("Scan complete");

    let aiAgentConfigured = false;

    if (detected.length === 0) {
      context.output(
        chalk.yellow(
          `\n${figures.warning} No AI CLIs detected.\n\nInstall one of the following:\n` +
            `  • Claude Code: https://claude.com/claude-code\n` +
            `  • GitHub Copilot: gh extension install copilot\n` +
            `  • Google Gemini: (installation link)\n`
        )
      );
    } else {
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

        if (typeof shouldUse !== "symbol" && shouldUse) {
          this.savePreference(tool);
          aiAgentConfigured = true;
        }
      } else {
        // Multiple tools detected, show selection menu
        const selected = await select({
          message: "Which AI agent would you like to use?",
          options: detected.map((tool) => ({
            value: tool.name,
            label: tool.displayName,
            hint: tool.version ? `v${tool.version}` : undefined,
          })),
        });

        if (typeof selected !== "symbol") {
          const tool = detected.find((t) => t.name === selected);
          if (tool) {
            this.savePreference(tool);
            aiAgentConfigured = true;
          }
        }
      }
    }

    // Step 2: Tech Stack Scanning
    context.output(chalk.bold("\n\nStep 2: Tech Stack Scanning\n"));

    const shouldScanTechStack = await confirm({
      message: "Would you like to scan and save your project's tech stack?",
      initialValue: true,
    });

    if (typeof shouldScanTechStack !== "symbol" && shouldScanTechStack) {
      context.output("");
      s.start("Analyzing project structure and dependencies...");

      try {
        const projectPath = process.cwd();
        const techStack = await TechStackDetector.scan(projectPath);

        s.stop("Scan complete!");

        // Display summary
        context.output(chalk.green(`\n${figures.tick} Tech stack detected:\n`));
        context.output(chalk.gray(TechStackDetector.getSummary(techStack)));

        // Save to preferences
        preferences.saveTechStack(techStack);
        context.output(chalk.green(`\n${figures.tick} Tech stack saved to preferences!`));
      } catch (error) {
        s.stop("Scan failed");
        context.error(
          `Failed to scan tech stack: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Final summary
    if (aiAgentConfigured || shouldScanTechStack) {
      outro(chalk.green(`\n${figures.tick} Setup complete!`));
    } else {
      context.output(chalk.gray("\nSetup cancelled"));
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
   * Scan and save tech stack
   */
  private async scanTechStack(context: CommandContext): Promise<void> {
    context.output(chalk.cyan.bold("\n🔍 Scanning project tech stack...\n"));

    const s = context.spinner;
    s.start("Analyzing project structure and dependencies...");

    try {
      const projectPath = process.cwd();
      const techStack = await TechStackDetector.scan(projectPath);

      s.stop("Scan complete!");

      // Display summary
      context.output(chalk.green(`\n${figures.tick} Tech stack detected:\n`));
      context.output(chalk.gray(TechStackDetector.getSummary(techStack)));

      // Ask to save
      const shouldSave = await confirm({
        message: "Save this tech stack to preferences?",
        initialValue: true,
      });

      if (typeof shouldSave === "symbol" || !shouldSave) {
        context.output(chalk.gray("\nScan cancelled"));
        return;
      }

      // Save to preferences
      preferences.saveTechStack(techStack);
      outro(chalk.green(`${figures.tick} Tech stack saved to preferences!`));
    } catch (error) {
      s.stop("Scan failed");
      context.error(
        `Failed to scan tech stack: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Show current preferences
   */
  private async showPreferences(context: CommandContext): Promise<void> {
    const agent = preferences.getAIAgent();
    const techStack = preferences.getTechStack();

    context.output(chalk.cyan.bold("\n📋 Current Preferences\n"));

    // Show AI Agent
    if (!agent || agent.provider === "none") {
      context.output(
        chalk.yellow(
          `${figures.warning} No AI agent configured.\n\nRun: ${chalk.cyan("hacksmith preferences setup")} to set up`
        )
      );
    } else {
      const updatedAt = new Date(agent.updated_at);
      const timeAgo = this.getTimeAgo(updatedAt);

      context.output(chalk.bold("AI Agent:"));
      context.output(`${chalk.green(figures.tick)} Provider: ${chalk.bold(agent.provider)}`);
      context.output(`${chalk.green(figures.tick)} Path: ${agent.cli_path}`);
      if (agent.version) {
        context.output(`${chalk.green(figures.tick)} Version: ${agent.version}`);
      }
      context.output(`${chalk.green(figures.tick)} Last updated: ${timeAgo}\n`);
    }

    // Show Tech Stack
    if (!techStack) {
      context.output(
        chalk.yellow(
          `${figures.warning} No tech stack scanned.\n\nRun: ${chalk.cyan("hacksmith preferences scan")} to scan project`
        )
      );
    } else {
      const scannedAt = new Date(techStack.scannedAt);
      const timeAgo = this.getTimeAgo(scannedAt);

      context.output(chalk.bold("\nTech Stack:"));
      context.output(chalk.gray(TechStackDetector.getSummary(techStack)));
      context.output(`\n${chalk.green(figures.tick)} Scanned: ${timeAgo}`);
      context.output(`${chalk.green(figures.tick)} Path: ${techStack.projectPath}\n`);
    }
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
