import { spawnSync } from "node:child_process";
import { test, expect } from "bun:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgRoot = dirname(__dirname);
const binPath = join(pkgRoot, "bin", "hacksmith");

test("hacksmith --help exits 0", () => {
  const result = spawnSync(binPath, ["--help"], { encoding: "utf8" });
  expect(result.status).toBe(0);
});

test("hacksmith init placeholder runs", () => {
  const result = spawnSync(binPath, ["init", "scalekit", "sso"], { encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("init: placeholder");
});
