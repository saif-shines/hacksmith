import { intro, outro, log, text, confirm } from "@clack/prompts";
import chalk from "chalk";
import figures from "figures";
import terminal from "terminal-kit";
import { Command, CommandContext } from "@/types/command.js";
import { createInteractiveContext } from "./context-factory.js";
import { preferences } from "@/utils/preferences-storage.js";
import { ProjectStorage } from "@/utils/project-storage.js";
import { BlueprintService } from "@/services/blueprint-service.js";
import { UIService } from "@/services/ui-service.js";
import { FlowExecutor } from "@/services/flow-executor.js";
import { isCancelled } from "@/utils/type-guards.js";

export class InteractiveCLI {
  private commands = new Map<string, Command>();
  private history: string[] = [];
  private isRunning = false;
  private term = terminal.terminal;

  constructor() {
    this.setupTerminal();
  }

  private setupTerminal() {
    // Handle Ctrl+C gracefully
    process.on("SIGINT", () => {
      this.shutdown();
    });

    // Handle terminal resize
    process.on("SIGWINCH", () => {
      this.term.clear();
      this.showWelcome();
    });
  }

  registerCommand(command: Command) {
    this.commands.set(command.name, command);
    if (command.aliases) {
      command.aliases.forEach((alias) => {
        this.commands.set(alias, command);
      });
    }
  }

  private showWelcome() {
    console.log();
    log.message(`From Browsing to Building. One Command.`, { symbol: chalk.cyan(figures.smiley) });
    log.message("Let's get you set up and ready to integrate!");
    console.log();
  }

  /**
   * Check if system-level preferences (AI agent) are configured
   */
  private hasSystemPreferences(): boolean {
    return preferences.hasAIAgent();
  }

  /**
   * Check if project-level preferences (tech stack) are configured
   */
  private hasProjectPreferences(): boolean {
    const projectStorage = new ProjectStorage();
    const techStack = projectStorage.getTechStack();
    return techStack !== null;
  }

  /**
   * Guide user through preference setup
   */
  private async setupPreferences(): Promise<void> {
    const hasSystem = this.hasSystemPreferences();
    const hasProject = this.hasProjectPreferences();

    if (hasSystem && hasProject) {
      return; // All preferences are set
    }

    log.step("First things first - let's set up your preferences");
    console.log();

    // Run the preferences setup command
    const preferencesCommand = this.commands.get("preferences");
    if (preferencesCommand) {
      const context = this.createCommandContext();
      await preferencesCommand.execute(["setup"], context);
    } else {
      log.warn("Preferences command not found. Continuing without setup.");
    }

    console.log();
  }

  private createCommandContext() {
    return createInteractiveContext();
  }

  /**
   * Prompt user for blueprint input
   */
  private async promptForBlueprint(): Promise<string | null> {
    const blueprintInput = await text({
      message: "Enter blueprint path, URL, or GitHub repo (owner/repo):",
      placeholder: "e.g., ./blueprint.toml, https://..., or owner/repo",
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return "Please provide a blueprint path, URL, or GitHub repository";
        }
      },
    });

    if (isCancelled(blueprintInput)) {
      return null;
    }

    return blueprintInput.trim();
  }

  /**
   * Process and execute a blueprint
   */
  private async processBlueprint(input: string): Promise<boolean> {
    const context = this.createCommandContext();

    try {
      // Check if we can list blueprints from this input
      if (BlueprintService.canList(input)) {
        context.spinner.start(`Reading blueprints from ${input}...`);
        const options = await BlueprintService.listAvailable(input);
        context.spinner.stop(`Found ${options.length} blueprint(s)`);

        const selectedUrl = await UIService.selectBlueprint(options);
        if (!selectedUrl) {
          log.info("No blueprint selected");
          return false;
        }

        // Load and execute the selected blueprint
        return await this.loadAndExecuteBlueprint(selectedUrl, context);
      } else {
        // Direct blueprint loading
        return await this.loadAndExecuteBlueprint(input, context);
      }
    } catch (error) {
      context.spinner.stop();
      const err = error as Error;
      log.error(`Error loading blueprint: ${err.message}`);
      return false;
    }
  }

  /**
   * Load and execute a blueprint
   */
  private async loadAndExecuteBlueprint(input: string, context: CommandContext): Promise<boolean> {
    try {
      context.spinner.start(`Loading blueprint from ${input}...`);
      const blueprint = await BlueprintService.load(input);
      context.spinner.stop();

      // Show blueprint info
      log.step(`Blueprint: ${input.split("/").pop()}`);
      log.step(`Topic: ${blueprint.overview?.description || "No description available"}`);
      console.log();

      // Check if there are flows to execute
      const hasFlows = blueprint.flows && blueprint.flows.length > 0;
      if (!hasFlows) {
        log.warn("This blueprint doesn't have any executable flows yet.");
        return false;
      }

      // Execute the flows
      const executor = new FlowExecutor(false);
      const result = await executor.executeFlows(blueprint);

      if (result.success) {
        executor.displaySummary();
        return true;
      } else if (result.cancelled) {
        log.info("Flow execution cancelled");
        return false;
      } else {
        log.error(`Flow execution failed: ${result.error || "Unknown error"}`);
        return false;
      }
    } catch (error) {
      const err = error as Error;
      log.error(`Error executing blueprint: ${err.message}`);
      return false;
    }
  }

  async start() {
    this.isRunning = true;

    intro(chalk.cyan("Welcome to Hacksmith!"));
    this.showWelcome();

    // Step 1: Check and setup preferences
    await this.setupPreferences();

    // Step 2: Main blueprint execution loop
    log.step("Ready to help you integrate! Let's select a blueprint.");
    console.log();

    while (this.isRunning) {
      try {
        // Prompt for blueprint
        const blueprintInput = await this.promptForBlueprint();
        if (!blueprintInput) {
          // User cancelled
          break;
        }

        // Add to history
        this.history.push(blueprintInput);
        console.log();

        // Process and execute blueprint
        await this.processBlueprint(blueprintInput);
        console.log();

        // Ask if user wants to run another blueprint
        const continueResponse = await confirm({
          message: "Would you like to run another blueprint?",
          initialValue: true,
        });

        if (isCancelled(continueResponse) || !continueResponse) {
          break;
        }

        console.log();
      } catch {
        // User cancelled (Ctrl+C) or error occurred
        break;
      }
    }

    this.shutdown();
  }

  private shutdown() {
    if (this.isRunning) {
      console.log();
      outro(chalk.cyan("Thanks for using Hacksmith!"));
      this.isRunning = false;
      process.exit(0);
    }
  }
}
