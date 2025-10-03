import { confirm } from "@clack/prompts";
import type { FlowStep } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import { TemplateEngine } from "@/utils/template-engine.js";
import { BaseStepType, type StepResult } from "./base-step.js";

/**
 * Confirm step type - asks for user confirmation
 */
export class ConfirmStepType extends BaseStepType {
  type = "confirm" as const;
  requiredFields = [];
  optionalFields = ["title", "message", "when"];

  async execute(step: FlowStep, context: VariableContext): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);

    const result = await confirm({
      message: interpolated.message || step.title || "Continue?",
      initialValue: true,
    });

    if (typeof result === "symbol" || !result) {
      return { success: false, cancelled: true };
    }

    return { success: true };
  }
}

export const confirmStepType = new ConfirmStepType();
