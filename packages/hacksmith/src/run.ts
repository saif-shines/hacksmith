#!/usr/bin/env node

import { Command } from "commander";
import { InteractiveCLI } from "./cli/interactive.js";
import { CommandRegistry } from "./cli/command-registry.js";
import { PlanCommand } from "./commands/plan.js";

async function main() {
  // Initialize command registry
  const registry = new CommandRegistry();
  registry.register(new PlanCommand());

  // If no arguments provided, start interactive mode
  if (process.argv.length <= 2) {
    const cli = new InteractiveCLI();

    // Register commands with interactive CLI
    for (const command of registry.getAll()) {
      cli.registerCommand(command);
    }

    // Start interactive mode
    await cli.start();
  } else {
    // Setup commander program for non-interactive mode
    const program = new Command();
    program
      .name("hacksmith")
      .description("Hacksmith CLI - Generate and manage integration plans")
      .version("0.0.3-0");

    // Setup commands from registry
    registry.setupCommanderProgram(program);

    // Parse command line arguments
    await program.parseAsync(process.argv);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
