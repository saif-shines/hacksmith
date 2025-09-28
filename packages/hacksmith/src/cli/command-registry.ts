import { Command as CommanderCommand } from "commander";
import { Command } from "../types/command.js";

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

    // Add options based on command type
    // This could be made more dynamic by adding option definitions to Command interface
    if (command.name === "plan") {
      cmd
        .option("-b, --blueprint <path>", "Path to blueprint TOML file (local path or HTTP URL)")
        .option("-j, --json", "Output only JSON format")
        .option("-h, --help", "Show help");
    }

    cmd.action(async (options) => {
      const { createNonInteractiveContext } = await import("./context-factory.js");
      const context = createNonInteractiveContext();

      // Convert commander options to args array format expected by command
      const args = this.convertOptionsToArgs(options);

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
