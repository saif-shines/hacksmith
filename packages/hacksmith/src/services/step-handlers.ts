import { intro, note, text, select, confirm } from "@clack/prompts";
import type { FlowStep, FlowInput } from "../types/blueprint.js";
import type { VariableContext } from "../utils/template-engine.js";
import { TemplateEngine } from "../utils/template-engine.js";
import chalk from "chalk";
import figures from "figures";

export interface StepResult {
  success: boolean;
  variables?: VariableContext;
  cancelled?: boolean;
}

export class StepHandlers {
  /**
   * Execute an info step - displays information to the user
   */
  static async executeInfoStep(step: FlowStep, context: VariableContext): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);
    const content = interpolated.markdown || "";

    if (step.title) {
      intro(chalk.cyan.bold(step.title));
    }

    note(content, step.title || "Info");

    return { success: true };
  }

  /**
   * Execute a navigate step - directs user to a URL
   */
  static async executeNavigateStep(step: FlowStep, context: VariableContext): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);
    const url = interpolated.url || "";
    const instructions = interpolated.instructions || [];

    // Display the navigation information
    let message = `${chalk.cyan.bold("Navigate to:")} ${chalk.underline(url)}`;

    if (instructions.length > 0) {
      message += "\n\n" + chalk.yellow("Instructions:");
      instructions.forEach((instruction) => {
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

  /**
   * Execute an input step - captures user input
   */
  static async executeInputStep(step: FlowStep, context: VariableContext): Promise<StepResult> {
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
   * Execute a choice step - presents options for user selection
   */
  static async executeChoiceStep(step: FlowStep, context: VariableContext): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);
    const options = interpolated.options || [];
    const saveTo = interpolated.save_to;

    if (!saveTo) {
      return { success: false };
    }

    const selected = await select({
      message: step.title || "Select an option",
      options: options.map((option) => ({
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

  /**
   * Execute a confirm step - asks for user confirmation
   */
  static async executeConfirmStep(step: FlowStep, context: VariableContext): Promise<StepResult> {
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

  /**
   * Execute a show_commands step - displays commands to the user
   */
  static async executeShowCommandsStep(
    step: FlowStep,
    context: VariableContext
  ): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);
    const commands = interpolated.commands || [];

    let message = "";
    commands.forEach((command) => {
      message += `  ${chalk.gray("$")} ${chalk.green(command)}\n`;
    });

    note(message.trim(), step.title || "Run Commands");

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

  /**
   * Execute an AI prompt step - displays AI prompt (future: actual AI integration)
   */
  static async executeAiPromptStep(step: FlowStep, context: VariableContext): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);
    const promptTemplate = interpolated.prompt_template || "";

    const message = `${chalk.yellow("AI Prompt Template:")}\n\n${promptTemplate}\n\n${chalk.gray("(AI integration not yet implemented)")}`;

    note(message, step.title || "AI Prompt");

    return { success: true };
  }

  /**
   * Helper method to prompt for a single input
   */
  private static async promptForInput(input: FlowInput): Promise<string | symbol> {
    return await text({
      message: input.label || input.name,
      placeholder: input.placeholder,
      // TODO: Add password masking support for sensitive inputs
    });
  }

  /**
   * Helper method to validate input against pattern
   */
  private static validateInput(
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
