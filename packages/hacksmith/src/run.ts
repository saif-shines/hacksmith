#!/usr/bin/env node

import { InteractiveCLI } from "./cli/interactive.js";
import { PlanCommand } from "./commands/plan.js";

async function main() {
  const cli = new InteractiveCLI();

  // Register commands
  cli.registerCommand(new PlanCommand());

  // Start interactive mode
  await cli.start();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
