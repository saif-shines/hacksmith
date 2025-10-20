import { confirm, log } from "@clack/prompts";
import chalk from "chalk";
import { Command, CommandContext } from "@/types/command.js";
import { SessionManager } from "@/utils/session-manager.js";
import { ProjectStorage } from "@/utils/project-storage.js";
import { isCancelled } from "@/utils/type-guards.js";

export class SessionCommand extends Command {
  name = "session";
  description = "Manage development sessions";
  aliases = ["sess"];

  async execute(args: string[], context: CommandContext): Promise<void> {
    const subcommand = args[0];

    switch (subcommand) {
      case "status":
        await this.showStatus();
        break;
      case "clear":
        await this.clearSession();
        break;
      case "list":
        await this.listProjects();
        break;
      case undefined:
        await this.showStatus();
        break;
      default:
        context.error(`Unknown subcommand: '${subcommand}'`);
        context.output("");
        context.output("Available subcommands:");
        context.output("  " + chalk.cyan("status") + " - Show current session status (default)");
        context.output("  " + chalk.cyan("clear") + "  - Clear current session state");
        context.output("  " + chalk.cyan("list") + "   - List all tracked projects");
        context.output("");
        context.output(chalk.gray("Example: ") + chalk.white("hacksmith session status"));
    }
  }

  /**
   * Show current session status
   */
  private async showStatus(): Promise<void> {
    if (!SessionManager.isInProject()) {
      log.warn("You're not in a project directory");
      log.info("Navigate to a project folder to see session status");
      return;
    }

    const sessionManager = new SessionManager();
    sessionManager.showSessionStatus();
  }

  /**
   * Clear current session
   */
  private async clearSession(): Promise<void> {
    if (!SessionManager.isInProject()) {
      log.warn("You're not in a project directory");
      return;
    }

    const sessionManager = new SessionManager();
    const currentSession = sessionManager.getCurrentSession();

    if (!currentSession) {
      log.info("No active session to clear");
      return;
    }

    if (currentSession.completed) {
      log.info("Session is already completed, clearing...");
      sessionManager.clearSession();
      log.success("Session cleared");
      return;
    }

    // Warn about clearing active session
    log.warn("You have an active session in progress");
    log.message(`Blueprint: ${currentSession.blueprint_name}`);
    log.message(`Flow: ${currentSession.current_flow}`);
    log.message(`Progress: Step ${(currentSession.current_step || 0) + 1}`);

    const shouldClear = await confirm({
      message: "Are you sure you want to clear this session? Progress will be lost.",
      initialValue: false,
    });

    if (isCancelled(shouldClear) || !shouldClear) {
      log.info("Session not cleared - your progress is safe");
      return;
    }

    sessionManager.clearSession();
    log.success("Session cleared");
  }

  /**
   * List all tracked projects
   */
  private async listProjects(): Promise<void> {
    const backups = ProjectStorage.listBackups();

    if (backups.length === 0) {
      log.info("No projects have been tracked yet");
      log.info("Projects are tracked automatically when you complete blueprints");
      return;
    }

    log.step(`Tracked Projects (${backups.length}):`);

    backups.forEach((project, index) => {
      const timeAgo = this.getTimeAgo(new Date(project.last_accessed));
      const gitInfo = project.git_remote ? ` (${this.getRepoName(project.git_remote)})` : "";

      log.message(`${index + 1}. ${project.display_name}${gitInfo}`, { symbol: "→" });
      log.message(`   Path: ${project.original_path}`);
      log.message(`   Blueprints completed: ${project.blueprint_count}`);
      log.message(`   Last used: ${timeAgo}`);
      log.message("");
    });

    log.info("Use 'hacksmith recover' to restore data from any of these projects");
  }

  /**
   * Get repository name from git URL
   */
  private getRepoName(gitUrl: string): string {
    return gitUrl.split("/").pop()?.replace(".git", "") || "unknown";
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
