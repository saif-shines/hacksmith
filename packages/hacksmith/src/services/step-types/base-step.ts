import type { FlowStep, FlowStepType } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface StepResult {
  success: boolean;
  variables?: VariableContext;
  cancelled?: boolean;
  error?: string;
}

/**
 * Base definition for a step type
 */
export interface StepTypeDefinition {
  type: FlowStepType;
  requiredFields: string[];
  optionalFields: string[];

  /**
   * Validate the step configuration
   */
  validate(step: FlowStep): ValidationResult;

  /**
   * Execute the step
   */
  execute(step: FlowStep, context: VariableContext, devMode?: boolean): Promise<StepResult>;
}

/**
 * Abstract base class for step type implementations
 */
export abstract class BaseStepType implements StepTypeDefinition {
  abstract type: FlowStepType;
  abstract requiredFields: string[];
  abstract optionalFields: string[];

  validate(step: FlowStep): ValidationResult {
    const errors: ValidationError[] = [];

    // Check required fields
    for (const field of this.requiredFields) {
      if (!(field in step) || step[field] === undefined || step[field] === null) {
        errors.push({
          field,
          message: `${this.type} steps require a '${field}' field`,
        });
      }
    }

    // Additional custom validation
    const customErrors = this.customValidation(step);
    errors.push(...customErrors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Override this method for step-specific validation
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected customValidation(_step: FlowStep): ValidationError[] {
    return [];
  }

  abstract execute(
    step: FlowStep,
    context: VariableContext,
    devMode?: boolean
  ): Promise<StepResult>;
}
