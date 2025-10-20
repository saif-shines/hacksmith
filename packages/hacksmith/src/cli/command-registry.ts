import { Command as CommanderCommand } from "commander";
import { Command } from "@/types/command.js";

export class CommandRegistry {
  private commands = new Map<string, Command>();

  register(command: Command): void {
    this.commands.set(command.name, command);
    if (command.aliases) {
      command.aliases.forEach((alias) => {
        this.commands.set(alias, command);
      });
    }
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAll(): Command[] {
    // Return unique commands (not aliases)
    const uniqueCommands = new Set<Command>();
    for (const command of this.commands.values()) {
      uniqueCommands.add(command);
    }
    return Array.from(uniqueCommands);
  }

  setupCommanderProgram(program: CommanderCommand): void {
    for (const command of this.getAll()) {
      this.addCommandToProgram(program, command);
    }
  }

  private addCommandToProgram(program: CommanderCommand, command: Command): void {
    const cmd = program.command(command.name).description(command.description);

    // Add aliases
    if (command.aliases && command.aliases.length > 0) {
      cmd.aliases(command.aliases);
    }

    // Add options based on command type
    // This could be made more dynamic by adding option definitions to Command interface
    if (command.name === "plan") {
      cmd
        .option("-b, --blueprint <path>", "Path to blueprint TOML file (local path or HTTP URL)")
        .option("-g, --github <repo>", "GitHub repository (owner/repo format)")
        .option("-e, --execute", "Execute blueprint flows interactively")
        .option("-d, --dev", "Development mode - skip interactive prompts")
        .option("-j, --json", "Output only JSON format")
        .option("-h, --help", "Show help");
    }

    if (command.name === "preferences") {
      cmd.argument("[subcommand]", "Subcommand (show, reset, setup, scan, or brief)", "setup");
    }

    if (command.name === "recover") {
      cmd.argument("[subcommand]", "Subcommand (list, project, or interactive)", "interactive");
    }

    if (command.name === "session") {
      cmd.argument("[subcommand]", "Subcommand (status, clear, or list)", "status");
    }

    cmd.action(async (subcommandOrOptions, maybeOptions) => {
      const { createNonInteractiveContext } = await import("./context-factory.js");
      const context = createNonInteractiveContext();

      // Handle subcommand arguments
      let args: string[] = [];
      let options: Record<string, unknown> = {};

      if (
        command.name === "preferences" ||
        command.name === "recover" ||
        command.name === "session"
      ) {
        // First argument is the subcommand
        if (typeof subcommandOrOptions === "string") {
          args = [subcommandOrOptions];
          options = maybeOptions || {};
        } else {
          options = subcommandOrOptions || {};
        }
      } else {
        // For other commands, convert options to args
        options = subcommandOrOptions || {};
        args = this.convertOptionsToArgs(options);
      }

      // Add any additional args from options for commands that don't use subcommands
      if (!["preferences", "recover", "session"].includes(command.name)) {
        args = this.convertOptionsToArgs(options);
      }

      try {
        await command.execute(args, context);
      } catch (error) {
        const err = error as Error;
        context.error(`Error executing command: ${err.message}`);
        process.exit(1);
      }
    });
  }

  private convertOptionsToArgs(options: Record<string, unknown>): string[] {
    const args: string[] = [];

    for (const [key, value] of Object.entries(options)) {
      if (value === true) {
        args.push(`--${key}`);
      } else if (typeof value === "string") {
        args.push(`--${key}`, value);
      }
    }

    return args;
  }
}
