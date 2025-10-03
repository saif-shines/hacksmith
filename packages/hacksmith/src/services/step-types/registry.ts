import type { FlowStep, FlowStepType } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import type { StepTypeDefinition, ValidationResult, StepResult } from "./base-step.js";

/**
 * Registry for managing step type definitions
 */
export class StepTypeRegistry {
  private types = new Map<FlowStepType, StepTypeDefinition>();

  /**
   * Register a step type definition
   */
  register(definition: StepTypeDefinition): void {
    this.types.set(definition.type, definition);
  }

  /**
   * Register multiple step type definitions
   */
  registerAll(definitions: StepTypeDefinition[]): void {
    definitions.forEach((def) => this.register(def));
  }

  /**
   * Get a step type definition
   */
  get(type: FlowStepType): StepTypeDefinition | undefined {
    return this.types.get(type);
  }

  /**
   * Check if a step type is registered
   */
  has(type: FlowStepType): boolean {
    return this.types.has(type);
  }

  /**
   * Get all registered step types
   */
  getAllTypes(): FlowStepType[] {
    return Array.from(this.types.keys());
  }

  /**
   * Validate a step using its registered definition
   */
  validate(step: FlowStep): ValidationResult {
    const definition = this.types.get(step.type);

    if (!definition) {
      return {
        valid: false,
        errors: [
          {
            field: "type",
            message: `Unknown step type: ${step.type}`,
          },
        ],
      };
    }

    return definition.validate(step);
  }

  /**
   * Execute a step using its registered definition
   */
  async execute(step: FlowStep, context: VariableContext): Promise<StepResult> {
    const definition = this.types.get(step.type);

    if (!definition) {
      return {
        success: false,
        error: `Unknown step type: ${step.type}`,
      };
    }

    return definition.execute(step, context);
  }
}

/**
 * Global step type registry instance
 */
export const stepRegistry = new StepTypeRegistry();
