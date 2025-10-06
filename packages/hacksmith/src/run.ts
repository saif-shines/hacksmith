#!/usr/bin/env node

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Command } from "commander";
import { InteractiveCLI } from "./cli/interactive.js";
import { CommandRegistry } from "./cli/command-registry.js";
import { PlanCommand } from "./commands/plan.js";
import { PreferencesCommand } from "./commands/preferences.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));
const version = packageJson.version;

async function main() {
  // Initialize command registry
  const registry = new CommandRegistry();
  registry.register(new PlanCommand());
  registry.register(new PreferencesCommand());

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
      .version(version);

    // Setup commands from registry
    registry.setupCommanderProgram(program);

    // Parse command line arguments
    await program.parseAsync(process.argv);
  }
}

main().catch((error) => {
  // More helpful error message (per clig.dev guidelines)
  console.error("\n❌ Something went wrong:");
  console.error(`   ${error instanceof Error ? error.message : String(error)}\n`);

  if (process.env.DEBUG) {
    console.error("Stack trace:");
    console.error(error instanceof Error ? error.stack : error);
  } else {
    console.error("💡 Run with DEBUG=1 for more details");
  }

  console.error("\n📝 Need help? https://github.com/saif-shines/hacksmith/issues\n");
  process.exit(1);
});
