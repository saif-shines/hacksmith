import { text, password } from "@clack/prompts";
import chalk from "chalk";
import type { FlowStep, FlowInput } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import { TemplateEngine } from "@/utils/template-engine.js";
import { isCancelled } from "@/utils/type-guards.js";
import { BaseStepType, type StepResult, type ValidationError } from "./base-step.js";

/**
 * Input step type - captures user input
 */
export class InputStepType extends BaseStepType {
  type = "input" as const;
  requiredFields = [];
  optionalFields = ["title", "save_to", "placeholder", "validate", "inputs", "when"];

  protected customValidation(step: FlowStep): ValidationError[] {
    const errors: ValidationError[] = [];

    // Either save_to or inputs must be present
    if (!step.save_to && !step.inputs) {
      errors.push({
        field: "save_to",
        message: "Input steps require either 'save_to' or 'inputs' field",
      });
    }

    return errors;
  }

  async execute(step: FlowStep, context: VariableContext, devMode = false): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);
    const variables: VariableContext = {};

    // Handle multi-input steps
    if (interpolated.inputs && interpolated.inputs.length > 0) {
      for (const input of interpolated.inputs) {
        // Use default value or empty string in dev mode
        if (devMode) {
          const defaultValue = input.placeholder || "";
          console.log(
            chalk.gray(`[DEV MODE] Using default value for ${input.name}: "${defaultValue}"`)
          );
          variables[input.name] = defaultValue;
          continue;
        }

        const value = await this.promptForInput(input);

        if (isCancelled(value)) {
          return { success: false, cancelled: true };
        }

        variables[input.name] = value;
      }

      return { success: true, variables };
    }

    // Handle single input step
    if (interpolated.save_to) {
      // Use default value or empty string in dev mode
      if (devMode) {
        const defaultValue = interpolated.placeholder || "";
        console.log(
          chalk.gray(
            `[DEV MODE] Using default value for ${interpolated.save_to}: "${defaultValue}"`
          )
        );
        variables[interpolated.save_to] = defaultValue;
        return { success: true, variables };
      }

      const value = await text({
        message: step.title || "Enter value",
        placeholder: interpolated.placeholder,
        validate: interpolated.validate
          ? (value) => this.validateInput(value, interpolated.validate!)
          : undefined,
      });

      if (isCancelled(value)) {
        return { success: false, cancelled: true };
      }

      variables[interpolated.save_to] = value;
      return { success: true, variables };
    }

    return { success: false };
  }

  /**
   * Helper method to prompt for a single input
   */
  private async promptForInput(input: FlowInput): Promise<string | symbol> {
    // Support password masking for sensitive inputs
    const isSensitive =
      input.name.toLowerCase().includes("password") ||
      input.name.toLowerCase().includes("secret") ||
      input.name.toLowerCase().includes("token");

    if (isSensitive) {
      return await password({
        message: input.label || input.name,
      });
    }

    return await text({
      message: input.label || input.name,
      placeholder: input.placeholder,
    });
  }

  /**
   * Helper method to validate input against pattern
   */
  private validateInput(
    value: string,
    validation: { pattern?: string; message?: string }
  ): string | undefined {
    if (!validation.pattern) {
      return undefined;
    }

    try {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        // More user-friendly validation message (per clig.dev guidelines)
        if (validation.message) {
          return validation.message;
        }
        // Provide helpful context instead of showing raw regex
        return `Please check your input format and try again`;
      }
    } catch {
      return "Invalid validation pattern configured";
    }

    return undefined;
  }
}

export const inputStepType = new InputStepType();
