import { Ajv, type ErrorObject } from "ajv";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { BlueprintConfig } from "../types/blueprint.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

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

  validateStepType(step: { type: string; [key: string]: unknown }): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate required fields per step type
    switch (step.type) {
      case "info":
        if (!step.markdown) {
          errors.push({
            field: "markdown",
            message: "Info steps require a 'markdown' field",
          });
        }
        break;

      case "navigate":
        if (!step.url) {
          errors.push({
            field: "url",
            message: "Navigate steps require a 'url' field",
          });
        }
        break;

      case "input":
        if (!step.save_to && !step.inputs) {
          errors.push({
            field: "save_to",
            message: "Input steps require either 'save_to' or 'inputs' field",
          });
        }
        break;

      case "choice":
        if (!step.options) {
          errors.push({
            field: "options",
            message: "Choice steps require an 'options' field",
          });
        }
        if (!step.save_to) {
          errors.push({
            field: "save_to",
            message: "Choice steps require a 'save_to' field",
          });
        }
        break;

      case "show_commands":
        if (!step.commands) {
          errors.push({
            field: "commands",
            message: "Show_commands steps require a 'commands' field",
          });
        }
        break;

      case "confirm":
        // Optional: message field
        break;

      case "ai_prompt":
        // Optional: provider, model, prompt_template
        break;

      default:
        errors.push({
          field: "type",
          message: `Unknown step type: ${step.type}`,
        });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
