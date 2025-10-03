import { intro, note } from "@clack/prompts";
import chalk from "chalk";
import type { FlowStep } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import { TemplateEngine } from "@/utils/template-engine.js";
import { BaseStepType, type StepResult } from "./base-step.js";

/**
 * Info step type - displays information to the user
 */
export class InfoStepType extends BaseStepType {
  type = "info" as const;
  requiredFields = ["markdown"];
  optionalFields = ["title", "when"];

  async execute(step: FlowStep, context: VariableContext): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);
    const content = interpolated.markdown || "";

    if (step.title) {
      intro(chalk.cyan.bold(step.title));
    }

    note(content, step.title || "Info");

    return { success: true };
  }
}

export const infoStepType = new InfoStepType();
