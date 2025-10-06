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
        const errorMessages = validation.errors
          .map((err) => `  - ${err.field}: ${err.message}`)
          .join("\n");

        throw new Error(`Blueprint validation failed:\n${errorMessages}\n\nSource: ${input}`);
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
}
