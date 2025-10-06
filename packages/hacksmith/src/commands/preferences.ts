import { select, confirm, outro, text } from "@clack/prompts";
import chalk from "chalk";
import figures from "figures";
import { writeFileSync } from "fs";
import { join } from "path";
import clipboardy from "clipboardy";
import { Command, CommandContext } from "@/types/command.js";
import { AICLIDetector, type DetectedAICLI, type AICLIProvider } from "@/utils/ai-cli-detector.js";
import { preferences } from "@/utils/preferences-storage.js";
import { TechStackDetector } from "@/utils/tech-stack-detector.js";
import { MissionBriefGenerator } from "@/utils/mission-brief-generator.js";
import { isCancelled, isNotCancelled } from "@/utils/type-guards.js";
import { MISSION_BRIEF_FILENAME } from "@/constants/files.js";

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
      case "brief":
        await this.generateMissionBrief(context);
        break;
      case undefined:
      case "setup":
        await this.setupPreferences(context);
        break;
      default:
        // More helpful error (per clig.dev guidelines)
        context.error(`Unknown subcommand: '${subcommand}'`);
        context.output("");
        context.output("Available subcommands:");
        context.output("  " + chalk.cyan("show") + "   - Display current preferences");
        context.output(
          "  " + chalk.cyan("setup") + "  - Interactive setup for AI agent and tech stack"
        );
        context.output("  " + chalk.cyan("scan") + "   - Scan and save project tech stack");
        context.output("  " + chalk.cyan("brief") + "  - Generate mission brief for AI agent");
        context.output("  " + chalk.cyan("reset") + "  - Reset all preferences");
        context.output("");
        context.output(chalk.gray("Example: ") + chalk.white("hacksmith preferences setup"));
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
          `\n${figures.warning} No AI CLIs detected.\n\nYou can:\n` +
            `  1. Install an AI CLI:\n` +
            `     • Claude Code: https://claude.com/claude-code\n` +
            `     • GitHub Copilot: gh extension install copilot\n` +
            `     • Google Gemini: (installation link)\n` +
            `  2. Use VS Code Copilot, Cursor, Windsurf, or other AI assistants\n`
        )
      );

      context.output(
        chalk.cyan(
          `\n${figures.info} When you execute blueprints, you can copy the mission brief to clipboard\n` +
            `  and paste it into any AI assistant to get help with integration.\n`
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

      // Always show selection menu with manual option
      const options = [
        ...detected.map((tool) => ({
          value: tool.name,
          label: tool.displayName,
          hint: tool.version ? `v${tool.version}` : undefined,
        })),
        {
          value: "manual",
          label: "Manual (copy to clipboard)",
          hint: "Use with VS Code, Cursor, Windsurf, etc.",
        },
      ];

      const selected = await select({
        message: "How would you like to work with AI?",
        options,
      });

      if (isNotCancelled(selected)) {
        if (selected === "manual") {
          // User chose manual mode - save this preference
          preferences.saveAIAgent({
            provider: "none",
            cli_path: "",
            updated_at: new Date().toISOString(),
          });

          context.output(
            chalk.cyan(
              `\n${figures.info} Manual mode configured! Mission brief will be copied to clipboard after execution.`
            )
          );
          context.output(
            chalk.gray(
              `${figures.pointer} You can paste it into VS Code Copilot, Cursor, Windsurf, or any AI assistant.\n`
            )
          );
          aiAgentConfigured = true; // We did save a preference (manual mode)
        } else {
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

    if (isNotCancelled(shouldScanTechStack) && shouldScanTechStack) {
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

      if (isCancelled(shouldSave) || !shouldSave) {
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
    if (!agent) {
      context.output(
        chalk.yellow(
          `${figures.warning} No AI agent configured.\n\nRun: ${chalk.cyan("hacksmith preferences setup")} to set up`
        )
      );
    } else if (agent.provider === "none") {
      // Manual mode
      context.output(chalk.bold("AI Agent:"));
      context.output(`${chalk.green(figures.tick)} Mode: ${chalk.bold("Manual (clipboard)")}`);
      context.output(
        `${chalk.gray(figures.pointer)} Mission briefs will be copied to clipboard for use in any AI assistant`
      );
      const updatedAt = new Date(agent.updated_at);
      const timeAgo = this.getTimeAgo(updatedAt);
      context.output(`${chalk.green(figures.tick)} Configured: ${timeAgo}\n`);
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
   * Generate mission brief
   */
  private async generateMissionBrief(context: CommandContext): Promise<void> {
    const techStack = preferences.getTechStack();

    if (!techStack) {
      context.output(
        chalk.yellow(
          `\n${figures.warning} No tech stack scanned.\n\nRun: ${chalk.cyan("hacksmith preferences scan")} first`
        )
      );
      return;
    }

    context.output(chalk.cyan.bold("\n📝 Generating Mission Brief...\n"));

    // Ask for integration goal (optional)
    const goal = await text({
      message: "What is your integration goal? (optional, press Enter to skip)",
      placeholder: "e.g., Integrate payment processing with Stripe",
    });

    const integrationGoal = typeof goal === "string" && goal.trim() ? goal.trim() : undefined;

    // Generate the brief
    const briefContent = MissionBriefGenerator.generate({
      integrationGoal,
    });

    // Save to ~/.hacksmith/mission-brief.md
    const briefPath = join(preferences.getPath(), "..", MISSION_BRIEF_FILENAME);

    try {
      writeFileSync(briefPath, briefContent, "utf-8");
      context.output(chalk.green(`\n${figures.tick} Mission brief generated successfully!`));
      context.output(chalk.gray(`\nLocation: ${briefPath}`));

      // Show a preview
      context.output(chalk.bold("\n📋 Preview:\n"));
      const preview = briefContent.split("\n").slice(0, 15).join("\n");
      context.output(chalk.gray(preview));
      context.output(chalk.gray("\n..."));

      // Offer to copy to clipboard
      const shouldCopy = await confirm({
        message: "Copy mission brief to clipboard?",
        initialValue: true,
      });

      if (isNotCancelled(shouldCopy) && shouldCopy) {
        try {
          await clipboardy.write(briefContent);
          outro(
            chalk.green(
              `\n${figures.tick} Mission brief copied to clipboard! Paste it into your AI assistant.`
            )
          );
        } catch (error) {
          context.output(
            chalk.yellow(
              `\n${figures.warning} Could not copy to clipboard: ${error instanceof Error ? error.message : String(error)}`
            )
          );
          outro(chalk.cyan(`\n${figures.info} Mission brief is ready at: ${briefPath}`));
        }
      } else {
        outro(chalk.cyan(`\n${figures.info} Mission brief is ready at: ${briefPath}`));
      }
    } catch (error) {
      context.error(
        `Failed to save mission brief: ${error instanceof Error ? error.message : String(error)}`
      );
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

    if (isCancelled(shouldReset) || !shouldReset) {
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
