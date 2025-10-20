import { outro, cancel, confirm } from "@clack/prompts";
import type { Flow, FlowStep, BlueprintConfig } from "@/types/blueprint.js";
import type { VariableContext } from "@/utils/template-engine.js";
import { TemplateEngine } from "@/utils/template-engine.js";
import { stepRegistry } from "./step-types/index.js";
import { storage, getBlueprintId } from "@/utils/storage.js";
import { preferences } from "@/utils/preferences-storage.js";
import chalk from "chalk";
import figures from "figures";

export interface FlowExecutionResult {
  success: boolean;
  variables: VariableContext;
  cancelled?: boolean;
  error?: string;
}

export class FlowExecutor {
  private context: VariableContext = {};
  private devMode: boolean;
  private blueprint?: BlueprintConfig;

  constructor(devMode = false) {
    this.devMode = devMode;
  }

  /**
   * Execute a single flow from a blueprint
   */
  async executeFlow(flow: Flow, blueprint: BlueprintConfig): Promise<FlowExecutionResult> {
    // Store blueprint reference
    this.blueprint = blueprint;

    // Initialize context with blueprint data and load saved variables (if not already initialized)
    if (Object.keys(this.context).length === 0) {
      this.context = this.initializeContext(blueprint);
    }

    console.log(chalk.cyan.bold(`\n${figures.pointer} ${flow.title}\n`));

    for (let i = 0; i < flow.steps.length; i++) {
      const step = flow.steps[i];

      // Check if step should be executed (conditional steps)
      if (step.when && !TemplateEngine.evaluateCondition(step.when, this.context)) {
        continue; // Skip this step
      }

      // Check if navigate step should be skipped (data already exists)
      if (this.shouldSkipNavigate(step, i, flow.steps)) {
        if (this.devMode) {
          // Dev mode: auto-skip
          console.log(
            chalk.gray(
              `${figures.tick} ${step.title || "Navigate"} - skipping (data already exists)\n`
            )
          );
          continue;
        } else {
          // Normal mode: ask user
          const shouldSkip = await confirm({
            message: `Data already captured. Skip "${step.title}"?`,
            initialValue: true,
          });

          if (typeof shouldSkip === "boolean" && shouldSkip) {
            console.log(chalk.gray(`${figures.tick} ${step.title} - skipped\n`));
            continue;
          }
        }
      }

      // Check if input step should be skipped (already completed)
      if (this.shouldSkipStep(step)) {
        console.log(
          chalk.gray(`${figures.tick} ${step.title || "Step"} - already completed, skipping\n`)
        );
        continue;
      }

      const result = await this.executeStep(step);

      if (result.cancelled) {
        cancel("Flow cancelled");
        return {
          success: false,
          cancelled: true,
          variables: this.context,
        };
      }

      if (!result.success) {
        return {
          success: false,
          error: `Step ${step.id} failed`,
          variables: this.context,
        };
      }

      // Merge step variables into context
      if (result.variables) {
        this.context = { ...this.context, ...result.variables };

        // Save variables to storage after each step
        if (this.blueprint) {
          this.saveVariablesToStorage();
        }
      }
    }

    outro(chalk.green(`${figures.tick} ${flow.title} completed!`));

    return {
      success: true,
      variables: this.context,
    };
  }

  /**
   * Execute multiple flows from a blueprint
   */
  async executeFlows(blueprint: BlueprintConfig): Promise<FlowExecutionResult> {
    if (!blueprint.flows || blueprint.flows.length === 0) {
      return {
        success: false,
        error: "No flows found in blueprint",
        variables: {},
      };
    }

    // Initialize context early to check for saved progress
    if (blueprint.flows && blueprint.flows.length > 0) {
      this.blueprint = blueprint;
      this.context = this.initializeContext(blueprint);
    }

    // Display overview if enabled (defaults to true)
    if (blueprint.overview.enabled !== false) {
      const shouldContinue = await this.displayOverview(blueprint);
      if (!shouldContinue) {
        cancel("Flow cancelled");
        return {
          success: false,
          cancelled: true,
          variables: {},
        };
      }
    }

    // Check if preferences are configured
    if (!preferences.hasAnyPreferences()) {
      const shouldContinue = await this.displayPreferencesPrompt();
      if (!shouldContinue) {
        cancel("Flow cancelled - Please run preferences setup first");
        return {
          success: false,
          cancelled: true,
          variables: {},
        };
      }
    }

    // Show progress summary after confirmations
    this.displayProgressSummary();

    // For now, execute flows sequentially
    // TODO: Support @clack/prompts group() for parallel flow selection
    for (const flow of blueprint.flows) {
      const result = await this.executeFlow(flow, blueprint);

      if (!result.success) {
        return result;
      }

      // Merge flow variables into main context
      this.context = { ...this.context, ...result.variables };
    }

    return {
      success: true,
      variables: this.context,
    };
  }

  /**
   * Execute a single step based on its type
   */
  private async executeStep(step: FlowStep): Promise<{
    success: boolean;
    variables?: VariableContext;
    cancelled?: boolean;
    error?: string;
  }> {
    return await stepRegistry.execute(step, this.context, this.devMode);
  }

  /**
   * Initialize context with blueprint data
   */
  private initializeContext(blueprint: BlueprintConfig): VariableContext {
    const context: VariableContext = {};

    // Add blueprint metadata
    if (blueprint.schema_version) {
      context.schema_version = blueprint.schema_version;
    }

    // Add slugs to context
    if (blueprint.slugs) {
      context.slugs = blueprint.slugs;
    }

    // Add auth config
    if (blueprint.auth) {
      context.auth = blueprint.auth;
    }

    // Add variables with default values
    if (blueprint.variables) {
      context.variables = blueprint.variables;
    }

    // Load and validate saved variables from storage
    const blueprintId = getBlueprintId(blueprint);
    const schemaVersion = blueprint.schema_version || "0.1.0";

    const savedVariables = storage.getValidatedVariables(
      blueprintId,
      schemaVersion,
      blueprint.variables
    );

    if (savedVariables) {
      Object.assign(context, savedVariables);
    }

    return context;
  }

  /**
   * Save variables to storage with version metadata
   */
  private saveVariablesToStorage(): void {
    if (!this.blueprint) return;

    const blueprintId = getBlueprintId(this.blueprint);
    const schemaVersion = this.blueprint.schema_version || "0.1.0";

    // Save user data and interpolated slugs, exclude blueprint config
    const variablesToSave: Record<string, unknown> = {};
    const configKeysToExclude = ["auth", "variables", "schema_version"];

    Object.entries(this.context).forEach(([key, value]) => {
      if (!configKeysToExclude.includes(key)) {
        // Interpolate slugs before saving
        if (key === "slugs" && typeof value === "object" && value !== null) {
          variablesToSave[key] = TemplateEngine.interpolateObject(value, this.context);
        } else {
          variablesToSave[key] = value;
        }
      }
    });

    storage.saveBlueprint(blueprintId, schemaVersion, variablesToSave);
  }

  /**
   * Get the current execution context
   */
  getContext(): VariableContext {
    return { ...this.context };
  }

  /**
   * Display flow summary
   */
  displaySummary(): void {
    console.log(chalk.cyan.bold("\n📋 Flow Summary\n"));

    const entries = Object.entries(this.context).filter(
      ([key]) => !["slugs", "auth", "sdk", "variables", "schema_version"].includes(key)
    );

    if (entries.length === 0) {
      console.log(chalk.gray("No variables captured"));
      return;
    }

    entries.forEach(([key, value]) => {
      const displayValue =
        typeof value === "string" && value.includes("secret") ? "[HIDDEN]" : String(value);

      console.log(`  ${chalk.yellow(key)}: ${displayValue}`);
    });

    console.log();
  }

  /**
   * Check if a step should be skipped because its data is already captured
   */
  private shouldSkipStep(step: FlowStep): boolean {
    // Only skip input and choice steps that save data
    if (step.type !== "input" && step.type !== "choice") {
      return false;
    }

    // Check single save_to variable
    if (step.save_to) {
      return this.context[step.save_to] !== undefined;
    }

    // Check multiple inputs
    if (step.inputs && step.inputs.length > 0) {
      return step.inputs.every((input) => this.context[input.name] !== undefined);
    }

    return false;
  }

  /**
   * Check if a navigate step should be skipped because captured data already exists
   */
  private shouldSkipNavigate(step: FlowStep, stepIndex: number, allSteps: FlowStep[]): boolean {
    if (step.type !== "navigate") {
      return false;
    }

    // Check explicit captures field
    if (step.captures) {
      const captureVars = Array.isArray(step.captures) ? step.captures : [step.captures];
      return captureVars.every((varName) => this.context[varName] !== undefined);
    }

    // Fallback: look-ahead to next input step (for backward compatibility)
    for (let i = stepIndex + 1; i < allSteps.length; i++) {
      const nextStep = allSteps[i];

      // Stop at next navigate or end
      if (nextStep.type === "navigate") {
        break;
      }

      // Check if this is an input/choice step
      if (nextStep.type === "input" || nextStep.type === "choice") {
        return this.shouldSkipStep(nextStep);
      }
    }

    return false;
  }

  /**
   * Display progress summary of already captured variables
   */
  private displayProgressSummary(): void {
    const capturedVars = Object.entries(this.context).filter(
      ([key]) => !["slugs", "auth", "sdk", "variables", "schema_version"].includes(key)
    );

    if (capturedVars.length === 0) {
      return; // No progress to show
    }

    console.log(chalk.cyan.bold(`\n${figures.info} Resuming from previous session\n`));
    console.log(chalk.white("Already captured:"));

    capturedVars.forEach(([key, value]) => {
      const displayValue =
        typeof value === "string" && value.length > 50
          ? value.substring(0, 47) + "..."
          : String(value);

      // Check if sensitive from blueprint definition or common patterns
      const variableDef = this.blueprint?.variables?.[key];
      const isSensitive =
        variableDef?.sensitive ||
        key.includes("secret") ||
        key.includes("password") ||
        key.includes("token");
      const finalValue = isSensitive ? chalk.gray("[HIDDEN]") : chalk.yellow(displayValue);

      console.log(`  ${chalk.green(figures.tick)} ${chalk.white(key)}: ${finalValue}`);
    });

    console.log();
  }

  /**
   * Display preferences prompt and get user confirmation
   */
  private async displayPreferencesPrompt(): Promise<boolean> {
    console.log();
    console.log(chalk.yellow.bold(`${figures.warning} Preferences Not Configured`));
    console.log();
    console.log(
      chalk.white("Setting up preferences helps Hacksmith provide better integration support:")
    );
    console.log();
    console.log(
      chalk.gray("  • ") +
        chalk.white("Tech Stack Scanning") +
        chalk.gray(" - Analyzes your project to provide context-aware code")
    );
    console.log(
      chalk.gray("    generation that matches your frameworks, languages, and dependencies")
    );
    console.log();
    console.log(
      chalk.gray("  • ") +
        chalk.white("AI Agent Configuration") +
        chalk.gray(" - Enables seamless handoff to your preferred")
    );
    console.log(
      chalk.gray("    AI assistant (Claude Code, GitHub Copilot, etc.) for automated integration")
    );
    console.log();
    console.log(
      chalk.cyan(
        `${figures.pointer} Run: ${chalk.bold("hacksmith preferences")} or ${chalk.bold("/preferences")} to set up`
      )
    );
    console.log();

    const response = await confirm({
      message: "Continue without preferences setup?",
      initialValue: false,
    });

    return typeof response === "boolean" && response;
  }

  /**
   * Display overview and get user confirmation
   */
  private async displayOverview(blueprint: BlueprintConfig): Promise<boolean> {
    const overview = blueprint.overview;
    if (!overview) return true;

    console.log();

    // Create box top
    const title = overview.title || "Blueprint Overview";
    const boxWidth = Math.max(title.length + 4, 60);
    const leftPadding = Math.floor((boxWidth - title.length) / 2);
    const rightPadding = boxWidth - title.length - leftPadding;

    console.log(chalk.blue("┌" + "─".repeat(boxWidth) + "┐"));
    console.log(
      chalk.blue("│") +
        " ".repeat(leftPadding) +
        chalk.bold.white(title) +
        " ".repeat(rightPadding) +
        chalk.blue("│")
    );
    console.log(chalk.blue("├" + "─".repeat(boxWidth) + "┤"));

    // Estimated time
    if (overview.estimated_time) {
      const timeText = `Estimated time: ${overview.estimated_time}`;
      const timePadding = " ".repeat(boxWidth - timeText.length - 1);
      console.log(chalk.blue("│") + " " + chalk.yellow(timeText) + timePadding + chalk.blue("│"));
      console.log(chalk.blue("│") + " ".repeat(boxWidth) + chalk.blue("│"));
    }

    // Steps
    if (overview.steps && overview.steps.length > 0) {
      const stepsHeader = "This will guide you through:";
      const headerPadding = " ".repeat(boxWidth - stepsHeader.length - 1);
      console.log(
        chalk.blue("│") + " " + chalk.white(stepsHeader) + headerPadding + chalk.blue("│")
      );

      overview.steps.forEach((step, index) => {
        const stepText = `  ${index + 1}. ${step}`;
        const stepPadding = " ".repeat(Math.max(0, boxWidth - stepText.length - 1));
        console.log(chalk.blue("│") + " " + stepText + stepPadding + chalk.blue("│"));
      });
    }

    // Box bottom
    console.log(chalk.blue("└" + "─".repeat(boxWidth) + "┘"));
    console.log();

    // Confirm to proceed
    const response = await confirm({
      message: "Ready to begin?",
      initialValue: true,
    });

    return typeof response === "boolean" && response;
  }
}
