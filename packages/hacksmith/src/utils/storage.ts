import Conf from "conf";
import semver from "semver";
import { homedir } from "os";
import { join } from "path";
import type { BlueprintConfig, VariableConfig } from "../types/blueprint.js";

interface BlueprintStorageData {
  schema_version: string;
  saved_at: string;
  variables: Record<string, unknown>;
}

interface StorageSchema {
  blueprints: Record<string, BlueprintStorageData>;
}

class Storage {
  private config: Conf<StorageSchema>;

  constructor() {
    this.config = new Conf<StorageSchema>({
      configName: "contextifact",
      cwd: join(homedir(), ".hacksmith"),
      defaults: {
        blueprints: {},
      },
      schema: {
        blueprints: {
          type: "object",
          additionalProperties: {
            type: "object",
          },
        },
      },
    });
  }

  /**
   * Save variables for a specific blueprint with version metadata
   */
  saveBlueprint(
    blueprintId: string,
    schemaVersion: string,
    variables: Record<string, unknown>
  ): void {
    const blueprints = this.config.get("blueprints");

    // Normalize schema version to semver
    const normalizedVersion = semver.valid(semver.coerce(schemaVersion)) || "0.0.0";

    blueprints[blueprintId] = {
      schema_version: normalizedVersion,
      saved_at: new Date().toISOString(),
      variables,
    };
    this.config.set("blueprints", blueprints);
  }

  /**
   * Get saved data for a specific blueprint (includes metadata)
   */
  getBlueprintData(blueprintId: string): BlueprintStorageData | undefined {
    const blueprints = this.config.get("blueprints");
    return blueprints[blueprintId];
  }

  /**
   * Get validated variables for a blueprint, checking version compatibility
   */
  getValidatedVariables(
    blueprintId: string,
    currentSchemaVersion: string,
    variableDefinitions?: Record<string, VariableConfig>
  ): Record<string, unknown> | null {
    const data = this.getBlueprintData(blueprintId);
    if (!data) return null;

    // Normalize current version to semver
    const currentVersion = semver.valid(semver.coerce(currentSchemaVersion)) || "0.0.0";

    // Check major version compatibility (breaking changes)
    if (semver.major(data.schema_version) !== semver.major(currentVersion)) {
      return null; // Incompatible version, discard data
    }

    // Validate variables against current definitions
    if (variableDefinitions) {
      const validatedVars: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(data.variables)) {
        const definition = variableDefinitions[key];

        // Variable no longer exists in blueprint
        if (!definition) continue;

        // Validate against pattern if defined
        if (definition.validation && typeof value === "string") {
          const pattern = new RegExp(definition.validation);
          if (!pattern.test(value)) {
            continue; // Skip invalid variable
          }
        }

        validatedVars[key] = value;
      }

      return validatedVars;
    }

    return data.variables;
  }

  /**
   * Delete stored variables for a blueprint
   */
  deleteBlueprint(blueprintId: string): void {
    const blueprints = this.config.get("blueprints");
    delete blueprints[blueprintId];
    this.config.set("blueprints", blueprints);
  }

  /**
   * List all stored blueprint IDs
   */
  listBlueprints(): string[] {
    const blueprints = this.config.get("blueprints");
    return Object.keys(blueprints);
  }

  /**
   * Clear all stored data
   */
  clear(): void {
    this.config.clear();
  }

  /**
   * Get the config file path
   */
  getConfigPath(): string {
    return this.config.path;
  }
}

// Singleton instance
export const storage = new Storage();

/**
 * Generate a unique blueprint ID from blueprint metadata
 */
export function getBlueprintId(blueprint: BlueprintConfig): string {
  // Use smith identifier if available, otherwise fall back to description hash
  if (blueprint.smith) {
    return blueprint.smith;
  }
  // Simple hash of description for fallback
  return blueprint.description?.replace(/\s+/g, "-").toLowerCase() || "default";
}
