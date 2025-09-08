#!/usr/bin/env node

import { argv, exit } from "node:process";
import { parse } from "smol-toml";

function printHelp(): void {
  console.log("hacksmith - integration assistant CLI\n");
  console.log("Usage:");
  console.log("  hacksmith init <provider> <usecase> [options]");
  console.log("  hacksmith plan <provider> <usecase> [options]");
  console.log("  hacksmith parse-toml <file> [options]");
  console.log("  hacksmith --help\n");
}

async function main(): Promise<void> {
  const args = argv.slice(2);
  const [command, filePath, ...options] = args;

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

  if (command === "parse-toml") {
    if (!filePath) {
      console.error("Error: Please provide a TOML file path");
      console.log("Usage: hacksmith parse-toml <file>");
      exit(1);
    }

    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      // Resolve the file path
      const resolvedPath = path.resolve(filePath);

      // Check if file exists
      await fs.access(resolvedPath);

      // Read and parse the TOML file
      const fileContent = await fs.readFile(resolvedPath, "utf-8");
      const parsed = parse(fileContent);

      // Check for --json flag to output JSON format
      const shouldOutputJson = options.includes("--json");

      if (shouldOutputJson) {
        console.log(JSON.stringify(parsed, null, 2));
      } else {
        console.log("📄 TOML File:", resolvedPath);
        console.log("🔍 Parsed Content:");
        console.dir(parsed, { depth: null, colors: true });
      }

      exit(0);
    } catch (error: unknown) {
      const err = error as Error & { code?: string; name?: string };
      if (err.code === "ENOENT") {
        console.error(`Error: File not found: ${filePath}`);
      } else if (err.name === "SyntaxError") {
        console.error(`Error: Invalid TOML syntax in ${filePath}`);
        console.error(err.message);
      } else {
        console.error(`Error: Failed to parse TOML file: ${err.message}`);
      }
      exit(1);
    }
  }

  if (command === "debug") {
    console.log("Toml Test starting");
    const blueprint = "./src/playground/example.blueprint.toml";

    // Read the file first
    const fs = await import("node:fs/promises");
    const fileContent = await fs.readFile(blueprint, "utf-8");

    // Then parse the content
    const parsed = parse(fileContent);
    console.log(parsed);
    exit(0);
  }

  console.log(`Unknown command: ${command}`);
  printHelp();
  exit(1);
}

main();
