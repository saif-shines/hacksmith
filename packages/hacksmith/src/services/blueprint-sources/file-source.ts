import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BaseBlueprintSource } from "./base-source.js";

export class FileSource extends BaseBlueprintSource {
  readonly name = "file";

  canHandle(input: string): boolean {
    // Handle local file paths (not URLs)
    return !input.startsWith("http://") && !input.startsWith("https://");
  }

  async fetchContent(filePath: string): Promise<string> {
    const resolvedPath = resolve(filePath);
    return await readFile(resolvedPath, "utf-8");
  }
}
