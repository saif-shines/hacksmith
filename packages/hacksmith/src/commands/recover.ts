import { select, confirm, log } from "@clack/prompts";
import chalk from "chalk";
import { existsSync, mkdirSync, copyFileSync } from "fs";
import { Command, CommandContext } from "@/types/command.js";
import { ProjectStorage, type ProjectRegistryEntry } from "@/utils/project-storage.js";
import { ProjectDetector } from "@/utils/project-detector.js";
import { isCancelled } from "@/utils/type-guards.js";

export class RecoverCommand extends Command {
  name = "recover";
  description = "Recover project data from system backups";
  aliases = ["restore"];

  async execute(args: string[], context: CommandContext): Promise<void> {
    const subcommand = args[0];

    switch (subcommand) {
      case "list":
        await this.listBackups();
        break;
      case "project":
        await this.recoverProject(args[1]);
        break;
      case "interactive":
      case undefined:
        await this.interactiveRecover();
        break;
      default:
        context.error(`Unknown subcommand: '${subcommand}'`);
        context.output("");
        context.output("Available subcommands:");
        context.output("  " + chalk.cyan("list") + "        - List available project backups");
        context.output("  " + chalk.cyan("project") + " <id> - Recover specific project by ID");
        context.output("  " + chalk.cyan("interactive") + "  - Interactive recovery (default)");
        context.output("");
        context.output(chalk.gray("Example: ") + chalk.white("hacksmith recover interactive"));
    }
  }

  /**
   * List available project backups
   */
  private async listBackups(): Promise<void> {
    const backups = ProjectStorage.listBackups();

    if (backups.length === 0) {
      log.warn("No project backups found");
      log.info("Backups are created automatically after successful blueprint completions");
      return;
    }

    log.step(`Found ${backups.length} project backup(s):`);

    backups.forEach((backup, index) => {
      const timeAgo = this.getTimeAgo(new Date(backup.last_accessed));
      log.message(`${index + 1}. ${backup.display_name}`, { symbol: "→" });
      log.message(`   Path: ${backup.original_path}`);
      log.message(`   Blueprints: ${backup.blueprint_count}`);
      log.message(`   Last used: ${timeAgo}`);
      if (backup.git_remote) {
        log.message(`   Git: ${backup.git_remote}`);
      }
      log.message("");
    });
  }

  /**
   * Interactive recovery process
   */
  private async interactiveRecover(): Promise<void> {
    // Check if we're in a project
    const currentProject = ProjectDetector.detectProject();
    if (!currentProject) {
      log.warn("You're not in a project directory");
      log.info("Navigate to a project folder first, then run this command");
      return;
    }

    // Check if current project already has data
    const storage = new ProjectStorage();
    const existingData = storage.getBlueprintData() || storage.getTechStack();

    if (existingData) {
      const shouldOverwrite = await confirm({
        message: "This project already has data. Do you want to overwrite it with backup data?",
        initialValue: false,
      });

      if (isCancelled(shouldOverwrite) || !shouldOverwrite) {
        log.info("Recovery cancelled - your existing data is safe");
        return;
      }
    }

    // Show available backups
    const backups = ProjectStorage.listBackups();

    if (backups.length === 0) {
      log.warn("No project backups available to recover from");
      return;
    }

    log.step("Select a project backup to recover:");

    const options = backups.map((backup, index) => {
      const timeAgo = this.getTimeAgo(new Date(backup.last_accessed));
      const gitInfo = backup.git_remote ? ` (${this.getRepoName(backup.git_remote)})` : "";

      return {
        value: index.toString(),
        label: `${backup.display_name}${gitInfo}`,
        hint: `${backup.blueprint_count} blueprints, ${timeAgo}`,
      };
    });

    const selected = await select({
      message: "Which backup would you like to recover?",
      options,
    });

    if (isCancelled(selected)) {
      log.info("Recovery cancelled");
      return;
    }

    const selectedIndex = parseInt(selected);
    const selectedBackup = backups[selectedIndex];

    await this.performRecovery(selectedBackup, currentProject.root);
  }

  /**
   * Recover specific project by hash or index
   */
  private async recoverProject(projectId: string): Promise<void> {
    if (!projectId) {
      log.error("Please specify a project ID or index");
      log.info("Use 'hacksmith recover list' to see available projects");
      return;
    }

    const backups = ProjectStorage.listBackups();

    if (backups.length === 0) {
      log.warn("No project backups available");
      return;
    }

    let selectedBackup: ProjectRegistryEntry | undefined;

    // Try to find by index (1-based)
    const index = parseInt(projectId) - 1;
    if (!isNaN(index) && index >= 0 && index < backups.length) {
      selectedBackup = backups[index];
    }

    if (!selectedBackup) {
      log.error(`Project '${projectId}' not found`);
      log.info("Use 'hacksmith recover list' to see available projects");
      return;
    }

    // Check if we're in a project
    const currentProject = ProjectDetector.detectProject();
    if (!currentProject) {
      log.warn("You're not in a project directory");
      log.info("Navigate to a project folder first, then run this command");
      return;
    }

    await this.performRecovery(selectedBackup, currentProject.root);
  }

  /**
   * Perform the actual recovery operation
   */
  private async performRecovery(backup: ProjectRegistryEntry, targetPath: string): Promise<void> {
    log.step(`Recovering data from: ${backup.display_name}`);

    try {
      // Ensure target .hacksmith directory exists
      const targetDir = join(targetPath, ".hacksmith");
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      // Find backup directory by project hash
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      const { homedir } = await import("os");

      const allProjects = readFileSync(
        join(homedir(), ".hacksmith", "project-registry.json"),
        "utf-8"
      );
      const registry = JSON.parse(allProjects);

      // Find the hash for this backup
      let backupHash: string | undefined;
      for (const [hash, project] of Object.entries(registry.projects)) {
        const projectEntry = project as ProjectRegistryEntry;
        if (
          projectEntry.original_path === backup.original_path &&
          projectEntry.display_name === backup.display_name
        ) {
          backupHash = hash;
          break;
        }
      }

      if (!backupHash) {
        log.error("Could not locate backup data");
        return;
      }

      const backupDir = join(homedir(), ".hacksmith", "projects", backupHash);

      if (!existsSync(backupDir)) {
        log.error("Backup directory not found");
        return;
      }

      // Copy files
      const filesToRecover = ["contextifact.json", "tech-stack.json"];
      let recoveredCount = 0;

      for (const filename of filesToRecover) {
        const sourcePath = join(backupDir, filename);
        const targetPath = join(targetDir, filename);

        if (existsSync(sourcePath)) {
          copyFileSync(sourcePath, targetPath);
          recoveredCount++;
          log.success(`Recovered ${filename}`);
        }
      }

      if (recoveredCount > 0) {
        log.success(`Recovery complete! Restored ${recoveredCount} file(s)`);
        log.info("You can now continue working with your recovered project data");
      } else {
        log.warn("No data files found to recover");
      }
    } catch (error) {
      log.error(`Recovery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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
