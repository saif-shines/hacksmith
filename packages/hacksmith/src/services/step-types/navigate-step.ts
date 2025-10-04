import { note, confirm, spinner } from "@clack/prompts";
import chalk from "chalk";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { FlowStep } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import { TemplateEngine } from "@/utils/template-engine.js";
import { MarkdownRenderer } from "@/utils/markdown-renderer.js";
import { BaseStepType, type StepResult } from "./base-step.js";

const execAsync = promisify(exec);

/**
 * Navigate step type - directs user to a URL
 */
export class NavigateStepType extends BaseStepType {
  type = "navigate" as const;
  requiredFields = ["url"];
  optionalFields = ["title", "instructions", "when"];

  async execute(step: FlowStep, context: VariableContext, devMode = false): Promise<StepResult> {
    const interpolated = TemplateEngine.interpolateObject(step, context);
    const url = interpolated.url || "";
    const instructions = interpolated.instructions || [];

    // Display the navigation information
    let message = `${chalk.cyan.bold("Opening:")} ${chalk.underline(url)}`;

    if (instructions.length > 0) {
      message += "\n\n" + chalk.yellow("Next steps:");
      instructions.forEach((instruction: string, index: number) => {
        const renderedInstruction = MarkdownRenderer.render(instruction);
        message += `\n  ${index + 1}. ${renderedInstruction}`;
      });
    }

    note(message, step.title || "Navigate");

    // Skip browser opening and confirmation in dev mode
    if (devMode) {
      console.log(chalk.gray("[DEV MODE] Skipping browser opening and confirmation"));
      return { success: true };
    }

    // Open browser
    const s = spinner();
    s.start("Opening browser...");

    try {
      await this.openBrowser(url);
      s.stop("Browser opened");
    } catch {
      s.stop("Could not open browser automatically");
      console.log(chalk.yellow(`Please manually open: ${url}`));
    }

    // Wait for user confirmation that they've completed the task
    const shouldContinue = await confirm({
      message: "Have you completed the steps above?",
      initialValue: true,
    });

    if (typeof shouldContinue === "symbol" || !shouldContinue) {
      return { success: false, cancelled: true };
    }

    // Return the constructed URL to be saved in context
    const variables: Record<string, unknown> = {};
    if (step.save_to) {
      variables[step.save_to] = url;
    }

    return { success: true, variables };
  }

  /**
   * Opens a URL in the default browser
   */
  private async openBrowser(url: string): Promise<void> {
    const platform = process.platform;

    let command: string;
    if (platform === "darwin") {
      command = `open "${url}"`;
    } else if (platform === "win32") {
      command = `start "" "${url}"`;
    } else {
      // Linux and others
      command = `xdg-open "${url}"`;
    }

    await execAsync(command);
  }
}

export const navigateStepType = new NavigateStepType();
