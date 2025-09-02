import { spawnSync } from "node:child_process";
import { test, expect } from "bun:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(__dirname);
const cliPath = join(repoRoot, "bin", "hacksmith.js");

test("hacksmith runs and prints welcome message", () => {
  const result = spawnSync("node", [cliPath], { encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Welcome to hacksmith!");
});

test("hacksmith --help exits 0 (placeholder)", () => {
  const result = spawnSync("node", [cliPath, "--help"], { encoding: "utf8" });
  expect(result.status).toBe(0);
});
