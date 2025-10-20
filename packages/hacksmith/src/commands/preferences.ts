import { select, confirm, text, log } from "@clack/prompts";
import chalk from "chalk";
import { writeFileSync } from "fs";
import { join } from "path";
import clipboardy from "clipboardy";
import { Command, CommandContext } from "@/types/command.js";
import { AICLIDetector, type DetectedAICLI, type AICLIProvider } from "@/utils/ai-cli-detector.js";
import { preferences } from "@/utils/preferences-storage.js";
import { TechStackDetector } from "@/utils/tech-stack-detector.js";
import { MissionBriefGenerator } from "@/utils/mission-brief-generator.js";
import { ProjectStorage } from "@/utils/project-storage.js";
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
        await this.showPreferences();
        break;
      case "reset":
        await this.resetPreferences();
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
    log.step("Let's set up your preferences");

    // Step 1: AI Agent Setup
    log.step("Step 1: AI Agent Configuration");

    // Detect installed AI CLIs
    const s = context.spinner;
    s.start("Scanning for installed AI CLIs...");

    const detected = await AICLIDetector.detectAll();
    s.stop("Scan complete");

    let aiAgentConfigured = false;

    if (detected.length === 0) {
      log.warn("I couldn't find any AI CLIs installed on your system.");
      log.message("Here's how I can help you get set up:");
      log.message("1. Install a dedicated AI CLI:");
      log.message(
        `   • \x1b]8;;https://claude.com/claude-code\x1b\\Claude Code\x1b]8;;\x1b\\ - Direct AI integration`
      );
      log.message("   • GitHub Copilot: Run 'gh extension install copilot'");
      log.message("   • Other AI CLI tools");
      log.message(
        "2. Or use your existing AI assistants (VS Code Copilot, Cursor, Windsurf, etc.)"
      );

      log.info(
        "When you execute blueprints, I'll copy the mission brief to your clipboard so you can paste it into any AI assistant for help with integration."
      );
    } else {
      // Show detected tools
      log.success(`Great! I found ${detected.length} AI CLI(s) on your system:`);
      detected.forEach((tool) => {
        const version = tool.version ? `v${tool.version}` : "";
        log.message(`${tool.displayName} ${version}`, { symbol: "→" });
        log.message(`  Installed at: ${tool.path}`);
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

          log.info("Perfect! I've configured manual mode for you.");
          log.info(
            "After executing blueprints, I'll copy the mission brief to your clipboard so you can paste it into any AI assistant."
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
    log.step("Step 2: Tech Stack Scanning");

    const shouldScanTechStack = await confirm({
      message:
        "Would you like me to analyze your project's tech stack? This helps me provide better code examples.",
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
        log.success("Excellent! I've analyzed your project:");
        log.message(TechStackDetector.getSummary(techStack));

        // Save to project storage
        const projectStorage = new ProjectStorage();
        projectStorage.saveTechStack(techStack);
        log.success(
          "I've saved your tech stack details. This will help me provide better integration guidance!"
        );
      } catch (error) {
        s.stop("Scan failed");
        context.error(
          `Failed to scan tech stack: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Final summary
    if (aiAgentConfigured || shouldScanTechStack) {
      log.success(
        "Perfect! Your preferences are all set up. I'm ready to help you with integrations!"
      );
    } else {
      log.info("No worries! You can run this setup anytime with 'hacksmith preferences setup'.");
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

    log.success(
      `Perfect! I've configured ${tool.displayName} as your AI assistant. You're all set!`
    );
  }

  /**
   * Scan and save tech stack
   */
  private async scanTechStack(context: CommandContext): Promise<void> {
    log.step("Scanning project tech stack...");

    const s = context.spinner;
    s.start("Analyzing project structure and dependencies...");

    try {
      const projectPath = process.cwd();
      const techStack = await TechStackDetector.scan(projectPath);

      s.stop("Scan complete!");

      // Display summary
      log.success("Great! Here's what I found in your project:");
      log.message(TechStackDetector.getSummary(techStack));

      // Ask to save
      const shouldSave = await confirm({
        message: "Should I save this tech stack information to help with future integrations?",
        initialValue: true,
      });

      if (isCancelled(shouldSave) || !shouldSave) {
        log.info("No problem! I won't save the tech stack information.");
        return;
      }

      // Save to project storage
      const projectStorage = new ProjectStorage();
      projectStorage.saveTechStack(techStack);
      log.success("Perfect! I've saved your tech stack information for future integrations.");
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
  private async showPreferences(): Promise<void> {
    const agent = preferences.getAIAgent();
    const projectStorage = new ProjectStorage();
    const techStack = projectStorage.getTechStack();

    log.step("Current Preferences");

    // Show AI Agent
    if (!agent) {
      log.warn("I don't have an AI agent configured yet.");
      log.info("Run 'hacksmith preferences setup' to choose your preferred AI assistant");
    } else if (agent.provider === "none") {
      // Manual mode
      log.step("AI Assistant Configuration:");
      log.message("Mode: Manual (clipboard copy)");
      log.message("I'll copy mission briefs to your clipboard for any AI assistant");
      const updatedAt = new Date(agent.updated_at);
      const timeAgo = this.getTimeAgo(updatedAt);
      log.message(`Set up: ${timeAgo}`);
    } else {
      const updatedAt = new Date(agent.updated_at);
      const timeAgo = this.getTimeAgo(updatedAt);

      log.step("AI Assistant Configuration:");
      log.message(`Assistant: ${agent.provider}`);
      log.message(`Location: ${agent.cli_path}`);
      if (agent.version) {
        log.message(`Version: ${agent.version}`);
      }
      log.message(`Last updated: ${timeAgo}`);
    }

    // Show Tech Stack
    if (!techStack) {
      log.warn("I haven't analyzed your project's tech stack yet.");
      log.info("Run 'hacksmith preferences scan' to analyze your current project");
    } else {
      const scannedAt = new Date(techStack.scannedAt);
      const timeAgo = this.getTimeAgo(scannedAt);

      log.step("Project Tech Stack:");
      log.message(TechStackDetector.getSummary(techStack));
      log.message(`Last analyzed: ${timeAgo}`);
      log.message(`Project location: ${techStack.projectPath}`);
    }
  }

  /**
   * Generate mission brief
   */
  private async generateMissionBrief(context: CommandContext): Promise<void> {
    const projectStorage = new ProjectStorage();
    const techStack = projectStorage.getTechStack();

    if (!techStack) {
      log.warn("I need to understand your project first!");
      log.info(
        "Run 'hacksmith preferences scan' to analyze your tech stack, then I can create a better mission brief"
      );
      return;
    }

    log.step("Generating Mission Brief...");

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
      log.success("Perfect! I've created your mission brief.");
      log.info(
        "You can find it at: " + `\x1b]8;;file://${briefPath}\x1b\\mission brief\x1b]8;;\x1b\\`
      );

      // Show a preview
      log.step("Here's a preview:");
      const preview = briefContent.split("\n").slice(0, 15).join("\n");
      log.message(preview);
      log.message("... (see full brief in file)");

      // Offer to copy to clipboard
      const shouldCopy = await confirm({
        message: "Would you like me to copy this mission brief to your clipboard?",
        initialValue: true,
      });

      if (isNotCancelled(shouldCopy) && shouldCopy) {
        try {
          await clipboardy.write(briefContent);
          log.success(
            "Great! I've copied the mission brief to your clipboard. You can now paste it into any AI assistant."
          );
        } catch (error) {
          log.warn(
            `I couldn't copy to clipboard: ${error instanceof Error ? error.message : String(error)}`
          );
          log.info(`No worries! You can find your mission brief at: ${briefPath}`);
        }
      } else {
        log.info(`No problem! Your mission brief is ready whenever you need it at: ${briefPath}`);
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
  private async resetPreferences(): Promise<void> {
    const shouldReset = await confirm({
      message:
        "Are you sure you want to reset all your preferences? This will clear your AI agent and tech stack settings.",
      initialValue: false,
    });

    if (isCancelled(shouldReset) || !shouldReset) {
      log.info("No worries! Your preferences are safe.");
      return;
    }

    preferences.clear();
    log.success(
      "All preferences have been reset. Run 'hacksmith preferences setup' to configure them again."
    );
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
