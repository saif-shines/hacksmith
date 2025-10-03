import { Ajv, type ErrorObject } from "ajv";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { BlueprintConfig, FlowStep } from "@/types/blueprint.js";
import { stepRegistry } from "./step-types/index.js";
import type { ValidationError, ValidationResult } from "./step-types/base-step.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class BlueprintValidator {
  private ajv: Ajv;
  private schema: object;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });

    // Load the JSON schema
    const schemaPath = join(__dirname, "..", "..", "..", "..", "spec", "blueprint-schema.json");
    this.schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
  }

  validate(blueprint: BlueprintConfig): ValidationResult {
    const validate = this.ajv.compile(this.schema);
    const valid = validate(blueprint);

    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors = this.formatErrors(validate.errors || []);
    return { valid: false, errors };
  }

  private formatErrors(ajvErrors: ErrorObject[]): ValidationError[] {
    return ajvErrors.map((error) => {
      const field = error.instancePath || error.schemaPath;
      let message = error.message || "Validation error";

      // Enhanced error messages based on error type
      switch (error.keyword) {
        case "required":
          message = `Missing required field: ${error.params.missingProperty}`;
          break;
        case "enum":
          message = `Invalid value. Expected one of: ${error.params.allowedValues.join(", ")}`;
          break;
        case "pattern":
          message = `Value does not match required pattern: ${error.params.pattern}`;
          break;
        case "type":
          message = `Expected type ${error.params.type}, got ${typeof error.data}`;
          break;
        case "additionalProperties":
          message = `Unknown property: ${error.params.additionalProperty}`;
          break;
        default:
          message = error.message || "Validation failed";
      }

      return {
        field: field.replace(/^\//, "").replace(/\//g, "."),
        message,
        value: error.data,
      };
    });
  }

  validateStepType(step: FlowStep): ValidationResult {
    return stepRegistry.validate(step);
  }
}
