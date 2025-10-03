import { text } from "@clack/prompts";
import type { FlowStep, FlowInput } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import { TemplateEngine } from "@/utils/template-engine.js";
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

  async execute(step: FlowStep, context: VariableContext): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);
    const variables: VariableContext = {};

    // Handle multi-input steps
    if (interpolated.inputs && interpolated.inputs.length > 0) {
      for (const input of interpolated.inputs) {
        const value = await this.promptForInput(input);

        if (typeof value === "symbol") {
          return { success: false, cancelled: true };
        }

        variables[input.name] = value;
      }

      return { success: true, variables };
    }

    // Handle single input step
    if (interpolated.save_to) {
      const value = await text({
        message: step.title || "Enter value",
        placeholder: interpolated.placeholder,
        validate: interpolated.validate
          ? (value) => this.validateInput(value, interpolated.validate!)
          : undefined,
      });

      if (typeof value === "symbol") {
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
    return await text({
      message: input.label || input.name,
      placeholder: input.placeholder,
      // TODO: Add password masking support for sensitive inputs
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
        return validation.message || `Value does not match pattern: ${validation.pattern}`;
      }
    } catch {
      return "Invalid validation pattern";
    }

    return undefined;
  }
}

export const inputStepType = new InputStepType();
