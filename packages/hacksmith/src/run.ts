#!/usr/bin/env node

import { Command } from "commander";
import { InteractiveCLI } from "./cli/interactive.js";
import { PlanCommand } from "./commands/plan.js";
import { CommandContext } from "./types/command.js";
import chalk from "chalk";
import figures from "figures";

// Create a simple command context for non-interactive mode
function createNonInteractiveContext(): CommandContext {
  return {
    terminal: null,
    output: (message: string) => console.log(message),
    error: (message: string) => console.log(chalk.red(`${figures.cross} ${message}`)),
    spinner: {
      start: (message: string) => console.log(chalk.gray(`${figures.ellipsis} ${message}`)),
      stop: (message?: string) => {
        if (message) console.log(chalk.green(`${figures.tick} ${message}`));
      },
    },
  };
}

async function main() {
  const program = new Command();

  // Configure the main program
  program
    .name("hacksmith")
    .description("Hacksmith CLI - Generate and manage integration plans")
    .version("0.0.3-0");

  // Initialize commands
  const planCommand = new PlanCommand();

  // Add plan command
  program
    .command("plan")
    .description(planCommand.description)
    .option("-b, --blueprint <path>", "Path to blueprint TOML file (local path or HTTP URL)")
    .option("-j, --json", "Output only JSON format")
    .option("-h, --help", "Show help")
    .action(async (options) => {
      const context = createNonInteractiveContext();

      // Convert commander options to args array format expected by command
      const args: string[] = [];
      if (options.blueprint) {
        args.push("--blueprint", options.blueprint);
      }
      if (options.json) {
        args.push("--json");
      }
      if (options.help) {
        args.push("--help");
      }

      await planCommand.execute(args, context);
    });

  // If no arguments provided, start interactive mode
  if (process.argv.length <= 2) {
    const cli = new InteractiveCLI();

    // Register commands
    cli.registerCommand(planCommand);

    // Start interactive mode
    await cli.start();
  } else {
    // Parse command line arguments
    await program.parseAsync(process.argv);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
