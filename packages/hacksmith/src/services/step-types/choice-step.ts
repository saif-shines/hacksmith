import { select } from "@clack/prompts";
import type { FlowStep } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import { TemplateEngine } from "@/utils/template-engine.js";
import { BaseStepType, type StepResult } from "./base-step.js";

/**
 * Choice step type - presents options for user selection
 */
export class ChoiceStepType extends BaseStepType {
  type = "choice" as const;
  requiredFields = ["options", "save_to"];
  optionalFields = ["title", "when"];

  async execute(step: FlowStep, context: VariableContext): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);
    const options = interpolated.options || [];
    const saveTo = interpolated.save_to;

    if (!saveTo) {
      return { success: false };
    }

    const selected = await select({
      message: step.title || "Select an option",
      options: options.map((option: string) => ({
        value: option,
        label: option,
      })),
    });

    if (typeof selected === "symbol") {
      return { success: false, cancelled: true };
    }

    return {
      success: true,
      variables: { [saveTo]: selected },
    };
  }
}

export const choiceStepType = new ChoiceStepType();
