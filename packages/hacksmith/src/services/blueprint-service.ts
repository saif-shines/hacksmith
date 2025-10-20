import type { BlueprintConfig } from "@/types/blueprint.js";
import type { BlueprintSource, BlueprintOption } from "./blueprint-sources/base-source.js";
import { FileSource } from "./blueprint-sources/file-source.js";
import { HttpSource } from "./blueprint-sources/http-source.js";
import { GitHubSource } from "./blueprint-sources/github-source.js";
import { BlueprintValidator } from "./blueprint-validator.js";

export class BlueprintService {
  private static sources: BlueprintSource[] = [
    new GitHubSource(), // Check GitHub first (more specific)
    new HttpSource(),
    new FileSource(),
  ];
  private static validator = new BlueprintValidator();

  static getSourceForInput(input: string): BlueprintSource {
    const source = this.sources.find((s) => s.canHandle(input));
    if (!source) {
      throw new Error(`No source handler found for input: ${input}`);
    }
    return source;
  }

  static async load(
    input: string,
    options?: { skipValidation?: boolean }
  ): Promise<BlueprintConfig> {
    const source = this.getSourceForInput(input);
    const blueprint = await source.load(input);

    // Validate blueprint unless explicitly skipped
    if (!options?.skipValidation) {
      const validation = this.validator.validate(blueprint);

      if (!validation.valid) {
        const coreError = this.formatValidationError(validation.errors[0], input);
        const error = new Error(coreError);
        (error as Error & { sourceUrl?: string }).sourceUrl = input;
        throw error;
      }

      // Validate individual flow steps if flows exist
      if (blueprint.flows) {
        for (const flow of blueprint.flows) {
          for (const step of flow.steps) {
            const stepValidation = this.validator.validateStepType(step);
            if (!stepValidation.valid) {
              const stepErrors = stepValidation.errors
                .map((err) => `  - ${err.field}: ${err.message}`)
                .join("\n");

              throw new Error(
                `Flow "${flow.id}" step "${step.id}" validation failed:\n${stepErrors}`
              );
            }
          }
        }
      }
    }

    return blueprint;
  }

  static async listAvailable(input: string): Promise<BlueprintOption[]> {
    const source = this.getSourceForInput(input);
    if (!source.listAvailable) {
      throw new Error(`Source ${source.name} does not support listing available blueprints`);
    }
    return source.listAvailable(input);
  }

  static canList(input: string): boolean {
    const source = this.getSourceForInput(input);
    return !!source.listAvailable;
  }

  private static formatValidationError(
    error: { field?: string; message?: string },
    source: string
  ): string {
    const field = error.field || "unknown";
    const message = error.message || "Validation failed";

    // Extract core reason
    let coreReason = message;
    if (message.includes("Missing required field:")) {
      const missingField = message.split("Missing required field: ")[1];
      coreReason = `Missing "${missingField}"`;
    }

    // Check if source is a clickable URL
    const isUrl = source.startsWith("http://") || source.startsWith("https://");

    if (isUrl) {
      // Extract filename from URL
      const urlParts = source.split("/");
      const filename = urlParts[urlParts.length - 1];
      return `[INCOMPLETE] - ${field}: ${coreReason} [${filename}]`;
    } else {
      return `[INCOMPLETE] - ${field}: ${coreReason}`;
    }
  }
}
