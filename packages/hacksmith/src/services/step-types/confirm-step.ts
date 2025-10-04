import { confirm } from "@clack/prompts";
import chalk from "chalk";
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

  async execute(step: FlowStep, context: VariableContext, devMode = false): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);

    // Auto-confirm in dev mode
    if (devMode) {
      console.log(chalk.gray("[DEV MODE] Auto-confirming"));
      return { success: true };
    }

    const result = await confirm({
      message: interpolated.message || step.title || "Continue?",
      initialValue: true,
    });

    if (typeof result === "symbol" || !result) {
      return { success: false, cancelled: true };
    }

    // Save confirmation result if save_to is specified
    const variables: Record<string, unknown> = {};
    if (step.save_to) {
      variables[step.save_to] = result;
    }

    return { success: true, variables };
  }
}

export const confirmStepType = new ConfirmStepType();
