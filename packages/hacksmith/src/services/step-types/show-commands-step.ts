import { note, confirm } from "@clack/prompts";
import chalk from "chalk";
import type { FlowStep } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import { TemplateEngine } from "@/utils/template-engine.js";
import { BaseStepType, type StepResult } from "./base-step.js";

/**
 * Show commands step type - displays commands to the user
 */
export class ShowCommandsStepType extends BaseStepType {
  type = "show_commands" as const;
  requiredFields = ["commands"];
  optionalFields = ["title", "when"];

  async execute(step: FlowStep, context: VariableContext, devMode = false): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);
    const commands = interpolated.commands || [];

    let message = "";
    commands.forEach((command: string) => {
      message += `  ${chalk.gray("$")} ${chalk.green(command)}\n`;
    });

    note(message.trim(), step.title || "Run Commands");

    // Skip confirmation in dev mode
    if (devMode) {
      console.log(chalk.gray("[DEV MODE] Auto-confirming"));
      return { success: true };
    }

    // Wait for user confirmation
    const shouldContinue = await confirm({
      message: "Ready to proceed?",
      initialValue: true,
    });

    if (typeof shouldContinue === "symbol" || !shouldContinue) {
      return { success: false, cancelled: true };
    }

    // Save commands if save_to is specified
    const variables: Record<string, unknown> = {};
    if (step.save_to) {
      variables[step.save_to] = commands;
    }

    return { success: true, variables };
  }
}

export const showCommandsStepType = new ShowCommandsStepType();
