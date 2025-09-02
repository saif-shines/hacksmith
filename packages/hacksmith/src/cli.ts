#!/usr/bin/env node

import { argv, exit } from "node:process";

function printHelp(): void {
  console.log("hacksmith - integration assistant CLI\n");
  console.log("Usage:");
  console.log("  hacksmith init <provider> <usecase> [options]");
  console.log("  hacksmith plan <provider> <usecase> [options]");
  console.log("  hacksmith --help\n");
}

function main(): void {
  const args = argv.slice(2);
  const [command] = args;

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    exit(0);
  }

  if (command === "init") {
    console.log("init: placeholder - implement interactive onboarding");
    exit(0);
  }

  if (command === "plan") {
    console.log("plan: placeholder - emit structured plan JSON");
    exit(0);
  }

  console.log(`Unknown command: ${command}`);
  printHelp();
  exit(1);
}

main();
