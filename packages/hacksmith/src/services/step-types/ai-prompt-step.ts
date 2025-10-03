import { note } from "@clack/prompts";
import chalk from "chalk";
import type { FlowStep } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import { TemplateEngine } from "@/utils/template-engine.js";
import { BaseStepType, type StepResult } from "./base-step.js";

/**
 * AI prompt step type - displays AI prompt (future: actual AI integration)
 */
export class AiPromptStepType extends BaseStepType {
  type = "ai_prompt" as const;
  requiredFields = [];
  optionalFields = ["title", "provider", "model", "prompt_template", "when"];

  async execute(step: FlowStep, context: VariableContext): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);
    const promptTemplate = interpolated.prompt_template || "";

    const message = `${chalk.yellow("AI Prompt Template:")}\n\n${promptTemplate}\n\n${chalk.gray("(AI integration not yet implemented)")}`;

    note(message, step.title || "AI Prompt");

    return { success: true };
  }
}

export const aiPromptStepType = new AiPromptStepType();
