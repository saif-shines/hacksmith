#!/usr/bin/env node

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Command } from "commander";
import { InteractiveCLI } from "./cli/interactive.js";
import { CommandRegistry } from "./cli/command-registry.js";
import { PlanCommand } from "./commands/plan.js";
import { PreferencesCommand } from "./commands/preferences.js";
import { RecoverCommand } from "./commands/recover.js";
import { SessionCommand } from "./commands/session.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));
const version = packageJson.version;

async function main() {
  // Initialize command registry
  const registry = new CommandRegistry();
  registry.register(new PlanCommand());
  registry.register(new PreferencesCommand());
  registry.register(new RecoverCommand());
  registry.register(new SessionCommand());

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
    // Check if first argument is a blueprint path (shorthand syntax)
    const firstArg = process.argv[2];
    const knownCommands = [
      "plan",
      "preferences",
      "recover",
      "session",
      "p",
      "prefs",
      "restore",
      "sess",
    ]; // Include aliases

    if (firstArg && !firstArg.startsWith("-") && !knownCommands.includes(firstArg)) {
      const remainingArgs = process.argv.slice(3);

      // Check if the argument looks like a GitHub repository (owner/repo format)
      const isGitHubRepo = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(firstArg);

      // Auto-add execute flag if not already present
      const hasExecuteFlag = remainingArgs.includes("-e") || remainingArgs.includes("--execute");
      const executeArgs = hasExecuteFlag ? [] : ["-e"];

      if (isGitHubRepo) {
        // GitHub repository shorthand with auto-execute
        process.argv = [
          process.argv[0],
          process.argv[1],
          "plan",
          "-g",
          firstArg,
          ...executeArgs,
          ...remainingArgs,
        ];
      } else {
        // Blueprint file shorthand with auto-execute
        process.argv = [
          process.argv[0],
          process.argv[1],
          "plan",
          "-b",
          firstArg,
          ...executeArgs,
          ...remainingArgs,
        ];
      }
    }

    // Setup commander program for non-interactive mode
    const program = new Command();
    program
      .name("_hacksmith")
      .description("From browsing to building, in one command")
      .version(version);

    // Setup commands from registry
    registry.setupCommanderProgram(program);

    // Handle unknown commands with helpful error
    program.on("command:*", function () {
      const unknownCommand = program.args[0];
      console.error(`
      ❌ Unknown command: ${unknownCommand}

      💡 If you meant to load a blueprint, use:
        hacksmith plan -b ${unknownCommand}
        or simply:
        hacksmith ${unknownCommand}

      📝 Type "hacksmith --help" for available commands
      `);
      process.exit(1);
    });

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
