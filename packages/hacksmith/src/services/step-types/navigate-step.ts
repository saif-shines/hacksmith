import { note, confirm } from "@clack/prompts";
import chalk from "chalk";
import figures from "figures";
import type { FlowStep } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import { TemplateEngine } from "@/utils/template-engine.js";
import { BaseStepType, type StepResult } from "./base-step.js";

/**
 * Navigate step type - directs user to a URL
 */
export class NavigateStepType extends BaseStepType {
  type = "navigate" as const;
  requiredFields = ["url"];
  optionalFields = ["title", "instructions", "when"];

  async execute(step: FlowStep, context: VariableContext): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);
    const url = interpolated.url || "";
    const instructions = interpolated.instructions || [];

    // Display the navigation information
    let message = `${chalk.cyan.bold("Navigate to:")} ${chalk.underline(url)}`;

    if (instructions.length > 0) {
      message += "\n\n" + chalk.yellow("Instructions:");
      instructions.forEach((instruction: string) => {
        message += `\n  ${figures.pointer} ${instruction}`;
      });
    }

    note(message, step.title || "Navigate");

    // Wait for user confirmation
    const shouldContinue = await confirm({
      message: "Ready to proceed?",
      initialValue: true,
    });

    if (typeof shouldContinue === "symbol" || !shouldContinue) {
      return { success: false, cancelled: true };
    }

    return { success: true };
  }
}

export const navigateStepType = new NavigateStepType();
