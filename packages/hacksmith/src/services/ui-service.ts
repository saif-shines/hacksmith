import { select } from "@clack/prompts";
import type { BlueprintOption } from "./blueprint-sources/base-source.js";

export class UIService {
  static async selectBlueprint(options: BlueprintOption[]): Promise<string | null> {
    if (options.length === 0) {
      throw new Error("No blueprint options available");
    }

    if (options.length === 1) {
      // Auto-select if only one option
      return options[0].url;
    }

    // Show selection for multiple blueprints
    const selectedPath = await select({
      message: "Select a blueprint file:",
      options: options.map((option) => ({
        value: option.url,
        label: option.name,
        hint: option.path,
      })),
    });

    return typeof selectedPath === "string" ? selectedPath : null;
  }
}
