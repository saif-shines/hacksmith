import { spawnSync } from "node:child_process";
import { test, expect } from "bun:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgRoot = dirname(__dirname);
const binPath = join(pkgRoot, "bin", "hacksmith");

test("hacksmith hello", () => {
  const result = spawnSync(binPath, ["hello"], { encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("hello");
});
