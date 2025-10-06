import { intro, outro, text } from "@clack/prompts";
import chalk from "chalk";
import figures from "figures";
import terminal from "terminal-kit";
import { Command } from "@/types/command.js";
import { createInteractiveContext } from "./context-factory.js";

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
    console.log(chalk.cyan.bold(`${figures.smiley} Be that _hacksmith`));
    console.log(chalk.gray("Type /help to see available commands or /exit to quit"));
    console.log();
  }

  private createCommandContext() {
    return createInteractiveContext();
  }

  private async handleSlashCommand(input: string): Promise<void> {
    const trimmed = input.slice(1); // Remove the '/'
    const [commandName, ...args] = trimmed.split(" ").filter((arg) => arg.length > 0);

    if (!commandName) {
      console.log(chalk.yellow("Please specify a command. Type /help for available commands."));
      return;
    }

    // Built-in commands
    if (commandName === "help") {
      this.showHelp();
      return;
    }

    if (commandName === "exit" || commandName === "quit") {
      this.shutdown();
      return;
    }

    if (commandName === "clear") {
      this.term.clear();
      this.showWelcome();
      return;
    }

    if (commandName === "history") {
      this.showHistory();
      return;
    }

    // User-defined commands
    const command = this.commands.get(commandName);
    if (!command) {
      // More helpful error with suggestions (per clig.dev guidelines)
      const availableCommands = Array.from(this.commands.entries())
        .filter(([name, cmd]) => name === cmd.name)
        .map(([name]) => name);
      const suggestion = this.findClosestCommand(commandName, availableCommands);

      console.log(chalk.red(`${figures.cross} Command '${commandName}' not found.`));
      if (suggestion) {
        console.log(chalk.yellow(`\nDid you mean '${suggestion}'?`));
      }
      console.log(chalk.gray("\nType /help to see available commands."));
      return;
    }

    try {
      const context = this.createCommandContext();
      await command.execute(args, context);
    } catch (error) {
      const err = error as Error;
      console.log(chalk.red(`${figures.cross} Error executing command: ${err.message}`));
      if (process.env.NODE_ENV === "development") {
        console.log(chalk.gray(err.stack));
      }
    }
  }

  private showHelp() {
    console.log(chalk.cyan.bold("Available Commands:"));
    console.log();

    // Built-in commands
    console.log(chalk.yellow("Built-in:"));
    console.log(`  ${chalk.green("/help")}     - Show this help message`);
    console.log(`  ${chalk.green("/clear")}    - Clear the screen`);
    console.log(`  ${chalk.green("/history")}  - Show command history`);
    console.log(`  ${chalk.green("/exit")}     - Exit the CLI`);
    console.log();

    // User commands
    if (this.commands.size > 0) {
      console.log(chalk.yellow("Commands:"));
      for (const [name, command] of this.commands) {
        if (name === command.name) {
          // Only show primary name, not aliases
          const aliases = command.aliases ? ` (${command.aliases.join(", ")})` : "";
          console.log(`  ${chalk.green(`/${name}`)}${aliases} - ${command.description}`);
        }
      }
      console.log();
    }
  }

  private showHistory() {
    if (this.history.length === 0) {
      console.log(chalk.gray("No command history yet."));
      return;
    }

    console.log(chalk.cyan.bold("Command History:"));
    this.history.forEach((cmd, index) => {
      console.log(`  ${chalk.gray(`${index + 1}.`)} ${cmd}`);
    });
    console.log();
  }

  private getCommandHint(): string {
    const builtInCommands = ["/help", "/clear", "/history", "/exit"];
    const userCommands = Array.from(this.commands.entries())
      .filter(([name, command]) => name === command.name)
      .map(([name]) => `/${name}`);

    const allCommands = [...userCommands, ...builtInCommands];
    return chalk.gray(`Available: ${allCommands.join(", ")}`);
  }

  async start() {
    this.isRunning = true;

    intro(chalk.cyan("Welcome to Hacksmith!"));
    this.showWelcome();

    while (this.isRunning) {
      try {
        console.log(this.getCommandHint());
        const input = await text({
          message: chalk.green("hacksmith>"),
          placeholder: "Enter a slash command",
        });

        if (typeof input === "string" && input.trim()) {
          const trimmedInput = input.trim();

          if (trimmedInput.startsWith("/")) {
            this.history.push(trimmedInput);
            console.log(); // Add spacing before command output
            await this.handleSlashCommand(trimmedInput);
            console.log(); // Add spacing after command output
          } else {
            console.log(
              chalk.yellow(
                `${figures.info} Commands must start with '/'. Try /help for available commands.`
              )
            );
          }
        }
      } catch {
        // User cancelled (Ctrl+C)
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

  /**
   * Find closest command name using simple Levenshtein distance
   */
  private findClosestCommand(input: string, commands: string[]): string | null {
    if (commands.length === 0) return null;

    const distances = commands.map((cmd) => ({
      command: cmd,
      distance: this.levenshteinDistance(input.toLowerCase(), cmd.toLowerCase()),
    }));

    const closest = distances.reduce((min, curr) => (curr.distance < min.distance ? curr : min));

    // Only suggest if distance is reasonable (less than half the command length)
    return closest.distance <= Math.max(3, input.length / 2) ? closest.command : null;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}
